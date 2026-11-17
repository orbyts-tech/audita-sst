import { describe, expect, it } from "vitest";
import forge from "node-forge";
import {
  assertEsocialSignatureShape,
  ESOCIAL_XMLDSIG,
  hasSignature,
  signEnvelopedXml,
} from "../src/services/xmldsig/signXml.js";
import { buildConsultaTabelaXml } from "../src/services/soap/buildMessages.js";

function keyPair() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  const attrs = [{ name: "commonName", value: "TEST" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(cert),
  };
}

describe("XMLDSig", () => {
  it("assina consulta S-1000 no padrão §6.7 (RSA-SHA256, C14N, Enveloped, EndCertOnly)", () => {
    const { privateKeyPem, certificatePem } = keyPair();
    const xml = buildConsultaTabelaXml({
      tpInsc: "1",
      nrInsc: "12345678",
      tpEvt: "S-1000",
    });
    const signed = signEnvelopedXml(xml, privateKeyPem, certificatePem);
    expect(hasSignature(signed)).toBe(true);
    expect(signed).toContain(ESOCIAL_XMLDSIG.signatureMethod);
    expect(signed).toContain(ESOCIAL_XMLDSIG.digestMethod);
    expect(signed).toContain(ESOCIAL_XMLDSIG.c14n);
    expect(signed).toContain(ESOCIAL_XMLDSIG.enveloped);
    expect(signed).toContain("X509Certificate");
    expect(signed).not.toMatch(/RSAKeyValue|KeyValue/);
    expect(() => assertEsocialSignatureShape(signed)).not.toThrow();
  });
});
