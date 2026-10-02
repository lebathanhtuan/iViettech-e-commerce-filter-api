// Giới hạn request theo IP trong RAM, phù hợp server đơn của đồ án.
// Khi chạy nhiều instance, dùng rate limiter có kho chung (Redis) hoặc gateway.
export function passwordResetRateLimit(limit) {
  const windowMs = 15 * 60 * 1000
  const requests = new Map()
  return (req, res, next) => {
    const now = Date.now()
    for (const [ip, entry] of requests) {
      if (entry.expiresAt <= now) requests.delete(ip)
    }
    const ip = req.ip
    const entry = requests.get(ip) || { count: 0, expiresAt: now + windowMs }
    entry.count += 1
    requests.set(ip, entry)
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.', retryAfter })
    }
    next()
  }
}
