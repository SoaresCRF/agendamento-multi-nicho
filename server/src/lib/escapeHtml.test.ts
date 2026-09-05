import { describe, it, expect } from 'vitest'
import { escapeHtml } from './escapeHtml'

describe('escapeHtml', () => {
  it('escapes the 5 HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quoted"`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quoted&quot;',
    )
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Joana Silva')).toBe('Joana Silva')
  })
})
