import { redisClient } from "./redis.js";

/**
 * Mengambil data dari Redis cache. Jika tidak ada, jalankan fetchFn dan simpan hasilnya di Redis.
 * @param key Kunci cache unik
 * @param fetchFn Fungsi untuk mengambil data dari database jika cache tidak ada (fallback)
 * @param expirationInSeconds Masa berlaku cache dalam detik (default: 600 detik / 10 menit)
 * @returns Data yang diminta (baik dari cache maupun dari database)
 */
export const fetchWithCache = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  expirationInSeconds: number = 600
): Promise<T> => {
  try {
    // 1. Cek apakah ada di cache
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return JSON.parse(cachedData) as T;
    }
  } catch (error) {
    console.warn("Redis GET error:", error);
    // Lanjutkan ke DB jika Redis error (sebagai fallback agar sistem tidak mati)
  }

  // 2. Fetch dari sumber asli (DB)
  const freshData = await fetchFn();

  // 3. Simpan ke cache jika datanya ada
  if (freshData !== null && freshData !== undefined) {
    try {
      await redisClient.setEx(key, expirationInSeconds, JSON.stringify(freshData));
    } catch (error) {
      console.warn("Redis SETEX error:", error);
    }
  }

  return freshData;
};

/**
 * Menghapus cache berdasarkan key tertentu
 * @param key Kunci cache yang akan dihapus
 */
export const invalidateCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.warn("Redis DEL error:", error);
  }
};
