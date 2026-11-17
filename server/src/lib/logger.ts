import pino from "pino";
import { getEnv } from "../config/env.js";

const SENSITIVE =
  /password|senha|pfx|private.?key|certificado|authorization|bearer|cookie/i;

export const logger = pino({
  level: (() => {
    try {
      return getEnv().LOG_LEVEL;
    } catch {
      return "info";
    }
  })(),
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "senha",
      "certPassword",
      "pfx",
      "privateKey",
    ],
    censor: "[REDACTED]",
  },
  hooks: {
    logMethod(inputArgs, method) {
      if (typeof inputArgs[0] === "string" && SENSITIVE.test(inputArgs[0])) {
        return method.apply(this, ["[mensagem potencialmente sensível omitida]"]);
      }
      return method.apply(this, inputArgs as never);
    },
  },
});
