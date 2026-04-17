export function generateWAMessage(job) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    const jobLink = `${baseUrl}/jo/${job.driver_link_token}`

    return `
🚛 *JOB ASSIGNMENT - SENTRAL LOGISTIK*

Halo *${job.driver_name}*,

Anda mendapatkan job baru:

📦 WO: ${job.wo_number}
📍 Dari: ${job.origin}
📍 Ke: ${job.destination}
💰 Harga: Rp ${job.price}

🔗 Detail Job:
${jobLink}

Mohon segera klik link di atas untuk:
✔ Review detail
✔ Accept / Reject job

Terima kasih.
Sentral Logistik
`.trim()
}