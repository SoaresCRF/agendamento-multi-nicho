import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('links an external descriptionId into aria-describedby, for screen readers', () => {
    render(<Textarea label="Bio" id="bio" descriptionId="bio-count" />)
    expect(screen.getByLabelText('Bio')).toHaveAttribute('aria-describedby', 'bio-count')
  })

  it('includes both the descriptionId and the error id in aria-describedby when both are present', () => {
    render(<Textarea label="Bio" id="bio" descriptionId="bio-count" error="Muito longo" />)
    const describedBy = screen.getByLabelText('Bio').getAttribute('aria-describedby')
    expect(describedBy).toContain('bio-count')
    expect(describedBy).toContain('bio-error')
  })
})
