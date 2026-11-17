import { SignedXml } from "xml-crypto";
import { AppError } from "../../lib/errors.js";

/** Algoritmos exigidos pelo Manual v1.16 §6.7 / Pacote Comunicação. */
export const ESOCIAL_XMLDSIG = {
  signatureMethod: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
  digestMethod: "http://www.w3.org/2001/04/xmlenc#sha256",
  c14n: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  enveloped: "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
} as const;

function pemToCertBody(certificatePem: string): string {
  return certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
}

/**
 * Assinatura XMLDSig Enveloped + C14N + RSA-SHA256 (Manual v1.16 §6.7).
 * KeyInfo: apenas X509Certificate (EndCertOnly) — sem KeyValue/RSAKeyValue.
 * Insere <Signature> como último filho do elemento raiz.
 */
export function signEnvelopedXml(xml: string, privateKeyPem: string, certificatePem: string): string {
  if (!xml.includes("<")) {
    throw new AppError("XML inválido para assinatura.", "XML_INVALID", 400);
  }

  const certBody = pemToCertBody(certificatePem);
  if (!certBody) {
    throw new AppError("Certificado PEM inválido para assinatura.", "XMLDSIG_CERT", 400);
  }

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    signatureAlgorithm: ESOCIAL_XMLDSIG.signatureMethod,
    canonicalizationAlgorithm: ESOCIAL_XMLDSIG.c14n,
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${certBody}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    xpath: "/*",
    transforms: [ESOCIAL_XMLDSIG.enveloped, ESOCIAL_XMLDSIG.c14n],
    digestAlgorithm: ESOCIAL_XMLDSIG.digestMethod,
  });

  sig.computeSignature(xml, {
    location: { reference: "/*", action: "append" },
  });

  const signed = sig.getSignedXml();
  assertEsocialSignatureShape(signed);
  return signed;
}

/** Valida presença dos algoritmos e KeyInfo EndCertOnly sem enviar ao governo. */
export function assertEsocialSignatureShape(signedXml: string): void {
  if (!hasSignature(signedXml)) {
    throw new AppError("Falha ao gerar assinatura XMLDSig.", "XMLDSIG_FAILED", 500);
  }
  if (!signedXml.includes(ESOCIAL_XMLDSIG.signatureMethod)) {
    throw new AppError("Assinatura sem RSA-SHA256 exigido pelo eSocial.", "XMLDSIG_ALG", 500);
  }
  if (!signedXml.includes(ESOCIAL_XMLDSIG.digestMethod)) {
    throw new AppError("Assinatura sem digest SHA-256 exigido pelo eSocial.", "XMLDSIG_DIGEST", 500);
  }
  if (!signedXml.includes(ESOCIAL_XMLDSIG.c14n)) {
    throw new AppError("Assinatura sem C14N exigida pelo eSocial.", "XMLDSIG_C14N", 500);
  }
  if (!signedXml.includes(ESOCIAL_XMLDSIG.enveloped)) {
    throw new AppError("Assinatura sem transform Enveloped exigida.", "XMLDSIG_ENV", 500);
  }
  if (!/<X509Certificate>[\sA-Za-z0-9+/=]+<\/X509Certificate>/.test(signedXml)) {
    throw new AppError("Assinatura sem X509Certificate (EndCertOnly).", "XMLDSIG_KEYINFO", 500);
  }
  if (/RSAKeyValue|KeyValue/.test(signedXml)) {
    throw new AppError(
      "Assinatura contém KeyValue/RSAKeyValue; eSocial exige apenas X509Certificate.",
      "XMLDSIG_KEYINFO_EXTRA",
      500,
    );
  }
}

export function hasSignature(xml: string): boolean {
  return /<([a-zA-Z0-9_]+:)?Signature[\s>]/.test(xml);
}
