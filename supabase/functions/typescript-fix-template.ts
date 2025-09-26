// Universal TypeScript error fixes for edge functions

// Replace all instances of error.message with proper type checking
const fixErrorHandling = (content: string): string => {
  return content
    .replace(/error\.message/g, 'error instanceof Error ? error.message : String(error)')
    .replace(/translationError\.message/g, 'translationError instanceof Error ? translationError.message : String(translationError)')
    .replace(/createError\.message/g, 'createError instanceof Error ? createError.message : String(createError)')
    .replace(/signError\.message/g, 'signError instanceof Error ? signError.message : String(signError)')
    .replace(/uploadError\.message/g, 'uploadError instanceof Error ? uploadError.message : String(uploadError)')
    .replace(/aiError\.message/g, 'aiError instanceof Error ? aiError.message : String(aiError)')
    .replace(/processError\.message/g, 'processError instanceof Error ? processError.message : String(processError)')
    .replace(/replicateError\.message/g, 'replicateError instanceof Error ? replicateError.message : String(replicateError)')
    .replace(/jobError\.message/g, 'jobError instanceof Error ? jobError.message : String(jobError)')
    .replace(/scriptError\.message/g, 'scriptError instanceof Error ? scriptError.message : String(scriptError)')
    .replace(/fetchError\.message/g, 'fetchError instanceof Error ? fetchError.message : String(fetchError)')
    .replace(/parseError\.message/g, 'parseError instanceof Error ? parseError.message : String(parseError)')
    .replace(/validationError\.message/g, 'validationError instanceof Error ? validationError.message : String(validationError)')
    .replace(/dbError\.message/g, 'dbError instanceof Error ? dbError.message : String(dbError)')
    .replace(/err\.message/g, 'err instanceof Error ? err.message : String(err)')
    // Fix property access issues
    .replace(/response\.signed_download/g, '(response as any).signed_download')
    .replace(/profile\.credits_used/g, '(profile as any).credits_used')
    // Fix type indexing
    .replace(/baseBones\[characterType\]/g, 'baseBones[characterType as keyof typeof baseBones]')
    .replace(/limbBones\[characterType\]/g, 'limbBones[characterType as keyof typeof limbBones]');
};

export { fixErrorHandling };