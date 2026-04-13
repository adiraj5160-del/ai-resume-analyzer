export function formatSize(bytes:number):String {
    if (bytes < 0) throw new Error("Size cannot be negative");
    if (bytes === 0) return "0 Bytes";

    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const index = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(1024, index);

    return `${parseFloat(value.toFixed(2))} ${units[index]}`;
}

export const generateUUID = () => crypto.randomUUID();