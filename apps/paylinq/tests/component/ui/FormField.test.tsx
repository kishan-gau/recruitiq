import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormField, { Input, TextArea, Select } from '@/components/ui/FormField'

describe('FormField', () => {
  describe('Basic Rendering', () => {
    it('renders label correctly', () => {
      render(
        <FormField label="Employee Name">
          <Input />
        </FormField>
      )
      
      expect(screen.getByText('Employee Name')).toBeInTheDocument()
    })

    it('renders children', () => {
      render(
        <FormField label="Test Field">
          <Input placeholder="Enter value" />
        </FormField>
      )
      
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
    })

    it('associates label with input using htmlFor', () => {
      render(
        <FormField label="Email" htmlFor="email-input">
          <Input id="email-input" />
        </FormField>
      )
      
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('for', 'email-input')
    })
  })

  describe('Required Field Indicator', () => {
    it('shows asterisk for required fields', () => {
      render(
        <FormField label="Required Field" required>
          <Input />
        </FormField>
      )
      
      const asterisk = screen.getByText('*')
      expect(asterisk).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-red-500')
    })

    it('does not show asterisk for optional fields', () => {
      render(
        <FormField label="Optional Field">
          <Input />
        </FormField>
      )
      
      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })
  })

  describe('Hint Text', () => {
    it('displays hint text when provided', () => {
      render(
        <FormField label="Password" hint="Must be at least 8 characters">
          <Input type="password" />
        </FormField>
      )
      
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument()
    })

    it('hides hint when error is present', () => {
      render(
        <FormField 
          label="Email" 
          hint="Enter a valid email"
          error="Email is required"
        >
          <Input />
        </FormField>
      )
      
      expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message', () => {
      render(
        <FormField label="Username" error="Username is required">
          <Input />
        </FormField>
      )
      
      const error = screen.getByText('Username is required')
      expect(error).toBeInTheDocument()
      expect(error).toHaveClass('text-red-600')
    })

    it('error takes precedence over hint', () => {
      render(
        <FormField 
          label="Field" 
          hint="This is a hint"
          error="This is an error"
        >
          <Input />
        </FormField>
      )
      
      expect(screen.getByText('This is an error')).toBeInTheDocument()
      expect(screen.queryByText('This is a hint')).not.toBeInTheDocument()
    })
  })
})

describe('Input', () => {
  describe('Basic Functionality', () => {
    it('renders input element', () => {
      render(<Input placeholder="Enter text" />)
      
      const input = screen.getByPlaceholderText('Enter text')
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
    })

    it('accepts user input', async () => {
      const user = userEvent.setup()
      render(<Input placeholder="Type here" />)
      
      const input = screen.getByPlaceholderText('Type here')
      await user.type(input, 'Hello World')
      
      expect(input).toHaveValue('Hello World')
    })

    it('supports different input types', () => {
      const { rerender } = render(<Input type="email" placeholder="Email" />)
      expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')
      
      rerender(<Input type="password" placeholder="Password" />)
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
      
      rerender(<Input type="number" placeholder="Number" />)
      expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number')
    })
  })

  describe('Error State', () => {
    it('applies error styling when error prop is true', () => {
      const { container } = render(<Input error={true} />)
      
      const input = container.querySelector('input')
      expect(input).toHaveClass('border-red-500')
    })

    it('applies normal styling when error prop is false', () => {
      const { container } = render(<Input error={false} />)
      
      const input = container.querySelector('input')
      expect(input).toHaveClass('border-gray-300')
      expect(input).not.toHaveClass('border-red-500')
    })
  })

  describe('Attributes', () => {
    it('supports disabled state', () => {
      render(<Input disabled placeholder="Disabled" />)
      
      expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
    })

    it('supports readonly state', () => {
      render(<Input readOnly value="Read only" />)
      
      const input = screen.getByDisplayValue('Read only')
      expect(input).toHaveAttribute('readonly')
    })

    it('accepts custom className', () => {
      const { container } = render(<Input className="custom-class" />)
      
      const input = container.querySelector('input')
      expect(input).toHaveClass('custom-class')
    })
  })
})

describe('TextArea', () => {
  describe('Basic Functionality', () => {
    it('renders textarea element', () => {
      render(<TextArea placeholder="Enter description" />)
      
      const textarea = screen.getByPlaceholderText('Enter description')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('accepts multi-line input', async () => {
      const user = userEvent.setup()
      render(<TextArea placeholder="Description" />)
      
      const textarea = screen.getByPlaceholderText('Description')
      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3')
      
      expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
    })

    it('supports rows attribute', () => {
      render(<TextArea rows={5} placeholder="Text" />)
      
      expect(screen.getByPlaceholderText('Text')).toHaveAttribute('rows', '5')
    })
  })

  describe('Error State', () => {
    it('applies error styling when error prop is true', () => {
      const { container } = render(<TextArea error={true} />)
      
      const textarea = container.querySelector('textarea')
      expect(textarea).toHaveClass('border-red-500')
    })

    it('applies normal styling when error prop is false', () => {
      const { container } = render(<TextArea error={false} />)
      
      const textarea = container.querySelector('textarea')
      expect(textarea).toHaveClass('border-gray-300')
    })
  })
})

describe('Select', () => {
  const testOptions = [
    { value: '', label: 'Select an option' },
    { value: 'full-time', label: 'Full-Time' },
    { value: 'part-time', label: 'Part-Time' },
    { value: 'contractor', label: 'Contractor' },
  ]

  describe('Basic Functionality', () => {
    it('renders select element with options', () => {
      render(<Select options={testOptions} />)
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Full-Time')).toBeInTheDocument()
      expect(screen.getByText('Part-Time')).toBeInTheDocument()
      expect(screen.getByText('Contractor')).toBeInTheDocument()
    })

    it('allows selecting an option', async () => {
      const user = userEvent.setup()
      render(<Select options={testOptions} />)
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'full-time')
      
      expect(select).toHaveValue('full-time')
    })

    it('renders all provided options', () => {
      render(<Select options={testOptions} />)
      
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(4)
    })
  })

  describe('Error State', () => {
    it('applies error styling when error prop is true', () => {
      const { container } = render(<Select options={testOptions} error={true} />)
      
      const select = container.querySelector('select')
      expect(select).toHaveClass('border-red-500')
    })

    it('applies normal styling when error prop is false', () => {
      const { container } = render(<Select options={testOptions} error={false} />)
      
      const select = container.querySelector('select')
      expect(select).toHaveClass('border-gray-300')
    })
  })

  describe('Attributes', () => {
    it('supports disabled state', () => {
      render(<Select options={testOptions} disabled />)
      
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('accepts custom className', () => {
      const { container } = render(<Select options={testOptions} className="custom-select" />)
      
      const select = container.querySelector('select')
      expect(select).toHaveClass('custom-select')
    })
  })
})

describe('Integration Tests', () => {
  describe('FormField with Input', () => {
    it('creates accessible form field', () => {
      render(
        <FormField label="Employee ID" htmlFor="emp-id" required>
          <Input id="emp-id" placeholder="Enter ID" />
        </FormField>
      )
      
      const input = screen.getByPlaceholderText('Enter ID')
      const label = screen.getByText('Employee ID')
      
      expect(label).toHaveAttribute('for', 'emp-id')
      expect(input).toHaveAttribute('id', 'emp-id')
    })

    it('displays error state correctly', () => {
      const { container } = render(
        <FormField label="Salary" error="Salary must be positive">
          <Input type="number" error={true} />
        </FormField>
      )
      
      expect(screen.getByText('Salary must be positive')).toBeInTheDocument()
      const input = container.querySelector('input')
      expect(input).toHaveClass('border-red-500')
    })
  })

  describe('FormField with Select', () => {
    it('creates accessible select field', () => {
      const options = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ]

      render(
        <FormField label="Status" htmlFor="status" required>
          <Select id="status" options={options} />
        </FormField>
      )
      
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('FormField with TextArea', () => {
    it('creates accessible textarea field', () => {
      render(
        <FormField 
          label="Comments" 
          htmlFor="comments"
          hint="Optional notes"
        >
          <TextArea id="comments" rows={4} />
        </FormField>
      )
      
      expect(screen.getByText('Comments')).toBeInTheDocument()
      expect(screen.getByText('Optional notes')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
    })
  })
})
