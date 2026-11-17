// Zero-dependency streaming RFC 1950/1951 Store ZIP generator for Cloudflare Workers & Node

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const processedEntries = entries.map((entry) => {
    const filenameBytes = encoder.encode(entry.filename);
    const crc = computeCrc32(entry.data);
    return {
      filenameBytes,
      data: entry.data,
      crc,
      uncompressedSize: entry.data.length,
      compressedSize: entry.data.length,
      localHeaderOffset: 0,
    };
  });

  // Calculate total buffer size needed
  let totalSize = 0;
  for (const entry of processedEntries) {
    // 30 bytes local header + filename length + data length
    totalSize += 30 + entry.filenameBytes.length + entry.data.length;
  }

  let centralDirSize = 0;
  for (const entry of processedEntries) {
    // 46 bytes central directory header + filename length
    centralDirSize += 46 + entry.filenameBytes.length;
  }

  // 22 bytes EOCD
  totalSize += centralDirSize + 22;

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // 1. Write Local File Headers + Data
  for (const entry of processedEntries) {
    entry.localHeaderOffset = offset;

    // Local file header signature (0x04034b50)
    view.setUint32(offset, 0x04034b50, true);
    // Version needed to extract (2.0)
    view.setUint16(offset + 4, 20, true);
    // General purpose bit flag
    view.setUint16(offset + 6, 0, true);
    // Compression method (0 = Store / uncompressed)
    view.setUint16(offset + 8, 0, true);
    // Last mod file time / date
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    // CRC-32
    view.setUint32(offset + 14, entry.crc, true);
    // Compressed size
    view.setUint32(offset + 18, entry.compressedSize, true);
    // Uncompressed size
    view.setUint32(offset + 22, entry.uncompressedSize, true);
    // Filename length
    view.setUint16(offset + 26, entry.filenameBytes.length, true);
    // Extra field length
    view.setUint16(offset + 28, 0, true);

    offset += 30;

    // Filename
    buffer.set(entry.filenameBytes, offset);
    offset += entry.filenameBytes.length;

    // File Data
    buffer.set(entry.data, offset);
    offset += entry.data.length;
  }

  const centralDirStartOffset = offset;

  // 2. Write Central Directory Headers
  for (const entry of processedEntries) {
    // Central file header signature (0x02014b50)
    view.setUint32(offset, 0x02014b50, true);
    // Version made by (2.0)
    view.setUint16(offset + 4, 20, true);
    // Version needed to extract (2.0)
    view.setUint16(offset + 6, 20, true);
    // General purpose bit flag
    view.setUint16(offset + 8, 0, true);
    // Compression method (0 = Store)
    view.setUint16(offset + 10, 0, true);
    // Last mod file time / date
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0, true);
    // CRC-32
    view.setUint32(offset + 16, entry.crc, true);
    // Compressed size
    view.setUint32(offset + 20, entry.compressedSize, true);
    // Uncompressed size
    view.setUint32(offset + 24, entry.uncompressedSize, true);
    // Filename length
    view.setUint16(offset + 28, entry.filenameBytes.length, true);
    // Extra field length
    view.setUint16(offset + 30, 0, true);
    // File comment length
    view.setUint16(offset + 32, 0, true);
    // Disk number start
    view.setUint16(offset + 34, 0, true);
    // Internal file attributes
    view.setUint16(offset + 36, 0, true);
    // External file attributes
    view.setUint32(offset + 38, 0, true);
    // Relative offset of local header
    view.setUint32(offset + 42, entry.localHeaderOffset, true);

    offset += 46;

    // Filename
    buffer.set(entry.filenameBytes, offset);
    offset += entry.filenameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  // EOCD signature (0x06054b50)
  view.setUint32(offset, 0x06054b50, true);
  // Number of this disk
  view.setUint16(offset + 4, 0, true);
  // Disk where central directory starts
  view.setUint16(offset + 6, 0, true);
  // Number of central directory records on this disk
  view.setUint16(offset + 8, processedEntries.length, true);
  // Total number of central directory records
  view.setUint16(offset + 10, processedEntries.length, true);
  // Size of central directory
  view.setUint32(offset + 12, centralDirSize, true);
  // Offset of start of central directory
  view.setUint32(offset + 16, centralDirStartOffset, true);
  // Comment length
  view.setUint16(offset + 20, 0, true);

  return buffer;
}
