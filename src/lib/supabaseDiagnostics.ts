type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function describeSupabaseError(error: unknown) {
  const maybeError = error as SupabaseLikeError;

  return {
    message: maybeError?.message ?? String(error),
    code: maybeError?.code ?? null,
    details: maybeError?.details ?? null,
    hint: maybeError?.hint ?? null,
  };
}

export function createSupabaseServiceError(context: string, error: unknown) {
  const details = describeSupabaseError(error);
  const suffix = [details.code, details.details, details.hint].filter(Boolean).join(" | ");
  const message = suffix ? `${context}: ${details.message} (${suffix})` : `${context}: ${details.message}`;

  return Object.assign(new Error(message), {
    cause: error,
    supabase: details,
  });
}
