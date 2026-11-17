import fs from "node:fs";
import forge from "node-forge";
import { AppError } from "../../lib/errors.js";

export type CertificateInfo = {
  subjectCN: string;
  subjectO?: string;
  cnpjBase?: string;
  cpf?: string;
  notBefore: string;
  notAfter: string;
  expired: boolean;
  serialNumber: string;
};

export type LoadedCertificate = {
  info: CertificateInfo;
  pfxBuffer: Buffer;
  password: string;
  /** PEM cert + key for tooling that needs them */
  certificatePem: string;
  privateKeyPem: string;
};

function extractCnpjFromSubject(attrs: forge.pki.CertificateField[]): string | undefined {
  const text = attrs
    .map((a) => `${a.name || a.type}=${a.value}`)
    .join(";");
  const cnpj = text.match(/(\d{14})/);
  if (cnpj) return cnpj[1];
  // ICP-Brasil OID often embeds CNPJ in CN as "RAZAO:CNPJ"
  const cn = attrs.find((a) => a.name === "commonName" || a.shortName === "CN");
  if (typeof cn?.value === "string") {
    const m = cn.value.replace(/\D/g, "").match(/(\d{14})/);
    if (m) return m[1];
    const base8 = cn.value.replace(/\D/g, "").match(/(\d{8})/);
    if (base8) return base8[1];
  }
  return undefined;
}

export class CertificateService {
  loadFromPfx(pfxBuffer: Buffer, password: string): LoadedCertificate {
    if (!pfxBuffer.length) {
      throw new AppError("Arquivo de certificado vazio.", "CERT_EMPTY", 400);
    }
    let asn1: forge.asn1.Asn1;
    try {
      asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
    } catch {
      throw new AppError("Arquivo PFX/P12 inválido.", "CERT_INVALID", 400);
    }

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch {
      throw new AppError("Senha do certificado incorreta ou arquivo inválido.", "CERT_PASSWORD", 400);
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];

    if (!certBag?.cert || !keyBag?.key) {
      throw new AppError(
        "Certificado ou chave privada não encontrados no PFX.",
        "CERT_INCOMPLETE",
        400,
      );
    }

    const cert = certBag.cert;
    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    if (now > notAfter) {
      throw new AppError("Certificado digital expirado.", "CERT_EXPIRED", 400);
    }
    if (now < notBefore) {
      throw new AppError("Certificado ainda não é válido.", "CERT_NOT_YET_VALID", 400);
    }

    const cnAttr = cert.subject.getField("CN");
    const oAttr = cert.subject.getField("O");
    const cnpjOrBase = extractCnpjFromSubject(cert.subject.attributes);

    const info: CertificateInfo = {
      subjectCN: typeof cnAttr?.value === "string" ? cnAttr.value : "desconhecido",
      subjectO: typeof oAttr?.value === "string" ? oAttr.value : undefined,
      cnpjBase: cnpjOrBase?.slice(0, 8),
      notBefore: notBefore.toISOString(),
      notAfter: notAfter.toISOString(),
      expired: false,
      serialNumber: cert.serialNumber,
    };

    return {
      info,
      pfxBuffer: Buffer.from(pfxBuffer),
      password,
      certificatePem: forge.pki.certificateToPem(cert),
      privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
    };
  }

  /**
   * Certificado efêmero apenas para ESOCIAL_TRANSPORT_MOCK (assinatura local).
   * Nunca usar contra endpoints oficiais.
   */
  createEphemeralDevCertificate(employerCnpj: string): LoadedCertificate {
    const digits = employerCnpj.replace(/\D/g, "");
    const password = "mock-dev-only";
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date(Date.now() - 60_000);
    cert.validity.notAfter = new Date(Date.now() + 86400000);
    const attrs = [
      { name: "commonName", value: `AUDITA-MOCK-DEV:${digits || "00000000000000"}` },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
      algorithm: "3des",
    });
    const pfx = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
    return this.loadFromPfx(pfx, password);
  }

  loadFromPath(pfxPath: string, password: string): LoadedCertificate {
    if (!pfxPath) {
      throw new AppError("Caminho do certificado não configurado.", "CERT_PATH_MISSING", 400);
    }
    if (!fs.existsSync(pfxPath)) {
      throw new AppError("Arquivo de certificado não encontrado.", "CERT_NOT_FOUND", 400);
    }
    const buf = fs.readFileSync(pfxPath);
    return this.loadFromPfx(buf, password);
  }

  assertCompatibleWithEmployer(info: CertificateInfo, employerCnpj: string) {
    const digits = employerCnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      throw new AppError("CNPJ do empregador inválido.", "CNPJ_INVALID", 400);
    }
    if (!info.cnpjBase) {
      // e-CPF de procurador/representante: compatibilidade plena exige consulta a PE;
      // nesta etapa apenas avisamos via detalhe sem bloquear se não houver CNPJ no subject.
      return { mode: "pessoa_fisica_ou_sem_cnpj_no_subject" as const };
    }
    const employerBase = digits.slice(0, 8);
    if (info.cnpjBase === employerBase || info.cnpjBase === digits) {
      return { mode: "mesmo_cnpj_base" as const };
    }
    throw new AppError(
      "Certificado não parece compatível com o CNPJ do empregador (base divergente). Use e-CNPJ do empregador ou procurador autorizado.",
      "CERT_CNPJ_MISMATCH",
      403,
      { certBase: info.cnpjBase, employerBase },
    );
  }
}

export const certificateService = new CertificateService();
