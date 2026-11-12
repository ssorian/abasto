import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

// Server HTML is what the user sees before hydration; clicks on it are lost,
// so buttons and tabs must arrive disabled and enable once the client hydrates.
describe('controls before hydration', () => {
  test('a button is disabled in server HTML', () => {
    const html = renderToStaticMarkup(<Button>Guardar</Button>)
    expect(html).toMatch(/<button[^>]* disabled=""/)
    expect(html).toContain('data-hydrating="true"')
  })

  test('a tab trigger is disabled in server HTML', () => {
    const html = renderToStaticMarkup(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">Productos</TabsTrigger>
          <TabsTrigger value="b">Lotes</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(html.match(/<button[^>]* disabled=""/g)?.length).toBe(2)
  })

  test('a button rendered as a link stays a working link', () => {
    const html = renderToStaticMarkup(
      <Button asChild>
        <a href="/inventario">Inventario</a>
      </Button>,
    )
    expect(html).toContain('href="/inventario"')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('data-hydrating')
  })
})
