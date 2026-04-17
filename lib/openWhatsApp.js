export function openWhatsApp(phoneNumber, message) {
    const encodedMessage = encodeURIComponent(message)

    const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

    window.open(url, "_blank")
}