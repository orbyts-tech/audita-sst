import { describe, expect, it } from "vitest";
import forge from "node-forge";
import { CertificateService } from "../src/services/certificate/CertificateService.js";
import { AppError } from "../src/lib/errors.js";

function makeSelfSignedPfx(password: string, cn = "EMPRESA TESTE:12345678000190") {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365);
  const attrs = [{ name: "commonName", value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(der, "binary");
}

describe("CertificateService", () => {
  const svc = new CertificateService();

  it("carrega PFX válido", () => {
    const pfx = makeSelfSignedPfx("senha-ok");
    const loaded = svc.loadFromPfx(pfx, "senha-ok");
    expect(loaded.info.subjectCN).toContain("EMPRESA");
    expect(loaded.info.cnpjBase).toBe("12345678");
  });

  it("rejeita senha errada", () => {
    const pfx = makeSelfSignedPfx("senha-ok");
    expect(() => svc.loadFromPfx(pfx, "errada")).toThrow(AppError);
  });

  it("rejeita buffer inválido", () => {
    expect(() => svc.loadFromPfx(Buffer.from("nao-e-pfx"), "x")).toThrow(AppError);
  });

  it("rejeita certificado expirado", () => {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "02";
    cert.validity.notBefore = new Date(Date.now() - 86400000 * 10);
    cert.validity.notAfter = new Date(Date.now() - 86400000);
    const attrs = [{ name: "commonName", value: "EXPIRADO:12345678000190" }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "s", {
      algorithm: "3des",
    });
    const pfx = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");
    expect(() => svc.loadFromPfx(pfx, "s")).toThrow(/expirado/i);
  });

  it("valida compatibilidade de CNPJ base", () => {
    const pfx = makeSelfSignedPfx("senha-ok");
    const loaded = svc.loadFromPfx(pfx, "senha-ok");
    expect(svc.assertCompatibleWithEmployer(loaded.info, "12345678000190").mode).toBe(
      "mesmo_cnpj_base",
    );
    expect(() =>
      svc.assertCompatibleWithEmployer(loaded.info, "99999999000191"),
    ).toThrow(AppError);
  });
});
