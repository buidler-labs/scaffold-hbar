type PackageManagerName = "npm" | "yarn";

const DEFAULT_PACKAGE_MANAGER: PackageManagerName = "yarn";

export const getPackageManagerName = (): PackageManagerName => {
  const [name] = process.env.NEXT_PUBLIC_PACKAGE_MANAGER?.split("@") ?? [];

  return name === "npm" || name === "yarn" ? name : DEFAULT_PACKAGE_MANAGER;
};

export const getPackageRunCommand = (scriptName: string) => {
  return getPackageManagerName() === "npm" ? `npm run ${scriptName}` : `yarn ${scriptName}`;
};
