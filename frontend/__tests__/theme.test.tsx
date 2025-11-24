import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// Componente de teste para acessar o hook useTheme
function TestComponent() {
  const { theme, actualTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="actual-theme">{actualTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear()
    // Remover classe dark do html
    document.documentElement.classList.remove('dark')
  })

  it('deve renderizar com tema padrão system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('deve aplicar tema dark quando setTheme é chamado', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByText('Set Dark')
    fireEvent.click(setDarkButton)

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('deve aplicar tema light quando setTheme é chamado', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setLightButton = screen.getByText('Set Light')
    fireEvent.click(setLightButton)

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  it('deve persistir tema no localStorage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByText('Set Dark')
    fireEvent.click(setDarkButton)

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark')
    })

    setItemSpy.mockRestore()
  })

  it('deve carregar tema do localStorage na inicialização', async () => {
    // Simular tema salvo no localStorage
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
    getItemSpy.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })

    getItemSpy.mockRestore()
  })

  it('deve alternar para system theme', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setSystemButton = screen.getByText('Set System')
    fireEvent.click(setSystemButton)

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    })
  })
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('deve renderizar o componente ThemeToggle', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Deve ter um botão com ícone
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeInTheDocument()
  })

  it('deve abrir menu ao clicar no botão', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(screen.getByText('Claro')).toBeInTheDocument()
      expect(screen.getByText('Escuro')).toBeInTheDocument()
      expect(screen.getByText('Sistema')).toBeInTheDocument()
    })
  })

  it('deve mudar tema ao selecionar opção no menu', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Abrir menu
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)

    // Clicar em Escuro (Dark)
    await waitFor(() => {
      const darkOption = screen.getByText('Escuro')
      fireEvent.click(darkOption)
    })

    // Verificar que tema mudou
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('deve fechar menu após selecionar tema', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Abrir menu
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)

    // Aguardar menu abrir e encontrar opções
    await waitFor(() => {
      expect(screen.getByText('Claro')).toBeInTheDocument()
    })

    // Clicar em Claro (Light)
    const lightOption = screen.getByText('Claro')
    fireEvent.click(lightOption)

    // Menu deve fechar
    await waitFor(() => {
      expect(screen.queryByText('Claro')).not.toBeInTheDocument()
    })
  })
})
