import * as fs from "fs";

const envFilePath = "./.env";

export const writeEnvVar = (key: string, value: string): void => {
  const content = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8") : "";
  const newLine = `${key}='${value}'`;
  const lines = content.split("\n");
  const idx = lines.findIndex(l => l.startsWith(`${key}=`));
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    lines.push(newLine);
  }
  fs.writeFileSync(envFilePath, lines.join("\n"));
};
