function separatorFor(path: string) {
  return path.includes("\\") ? "\\" : "/";
}

export function getDirectory(filePath: string): string {
  const index = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return index >= 0 ? filePath.slice(0, index) : "";
}

export function getBaseName(filePath: string): string {
  const directory = getDirectory(filePath);
  return filePath.slice(directory.length + 1);
}

export function getStem(filePath: string): string {
  const baseName = getBaseName(filePath);
  const dot = baseName.lastIndexOf(".");
  return dot >= 0 ? baseName.slice(0, dot) : baseName;
}

export function joinPath(directory: string, name: string): string {
  if (!directory) return name;
  const separator = separatorFor(directory);
  return directory.endsWith(separator) ? `${directory}${name}` : `${directory}${separator}${name}`;
}

export function changeExtension(filePath: string, extension: string): string {
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return joinPath(getDirectory(filePath), `${getStem(filePath)}${normalizedExtension}`);
}

export function siblingOutputDir(inputPath: string, suffix = "_out"): string {
  return joinPath(getDirectory(inputPath), `${getStem(inputPath)}${suffix}`);
}

export function optionBuildOutputDir(inputDir: string): string {
  return joinPath(getDirectory(inputDir), `${getBaseName(inputDir)}-output`);
}

export function musicBuildOutputDir(chartPath: string): string {
  return siblingOutputDir(chartPath, "_music");
}

export function afbExtractOutputDir(inputPath: string): string {
  return siblingOutputDir(inputPath, "_afb");
}

export function musicExtractOutputDir(musicXmlPath: string): string {
  const dir = getDirectory(musicXmlPath);
  return dir ? siblingOutputDir(dir, "_ugc") : siblingOutputDir(musicXmlPath, "_ugc");
}

export function audioExtractOutputDir(inputPath: string): string {
  return siblingOutputDir(inputPath, "_wav");
}
