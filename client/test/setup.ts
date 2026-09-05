import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement <dialog>'s native modal behavior at all (no
// showModal/close, no Escape-to-close, no Tab focus-trap) — real browsers give
// components built on <dialog> all of that for free, but the test environment
// needs it polyfilled to exercise that behavior under jsdom.
const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  const keydownListeners = new WeakMap<HTMLDialogElement, (e: KeyboardEvent) => void>()

  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cancelEvent = new Event('cancel', { cancelable: true })
        this.dispatchEvent(cancelEvent)
        if (!cancelEvent.defaultPrevented) this.close()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(this.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    keydownListeners.set(this, onKeyDown)
    document.addEventListener('keydown', onKeyDown)
  }

  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    const onKeyDown = keydownListeners.get(this)
    if (onKeyDown) document.removeEventListener('keydown', onKeyDown)
    this.dispatchEvent(new Event('close'))
  }
}
