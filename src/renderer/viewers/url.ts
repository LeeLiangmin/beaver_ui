export const toAppFileUrl = (absPath: string) =>
  `appfile://local/${encodeURIComponent(absPath)}`
