import { useParams } from "react-router-dom";
import { assertEntityId } from "@/lib/security/entityId";

/** Lê `:id` da rota só se for um identificador seguro. */
export function useSafeParamId(paramName = "id"): string | null {
  const params = useParams();
  return assertEntityId(params[paramName]);
}
