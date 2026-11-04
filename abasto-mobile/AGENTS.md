
# AGENTS.md

## Product

**Abarroteros** es una aplicación B2B para abastecimiento de tiendas de abarrotes.

En esta etapa estamos desarrollando **exclusivamente la UI**.

El diseño y HTML de referencia ya existen. La tarea principal es **implementarlos fielmente en la aplicación**, respetando estructura, estilos, espaciados, tipografía, colores y comportamiento visual.

## Current Scope

Por ahora:

* Implementar únicamente UI.
* No implementar backend.
* No integrar APIs reales.
* No crear lógica de negocio innecesaria.
* No agregar funcionalidades que no estén representadas en la UI existente.
* Usar datos mock cuando sea necesario para representar estados visuales.

La prioridad es **fidelidad visual y buena organización del código**.

## Implementation Rules

* No rediseñar la interfaz.
* No cambiar UX sin una razón técnica necesaria.
* Mantener el HTML de referencia visualmente fiel.
* Dividir pantallas grandes en componentes pequeños y reutilizables.
* Evitar componentes genéricos o abstracciones prematuras.
* Reutilizar componentes cuando exista una repetición real.
* Mantener componentes específicos dentro del módulo al que pertenecen.
* Mover a `shared` solamente componentes genuinamente reutilizados entre varios módulos.
* Mantener estilos y estructura simples y fáciles de modificar.

## Worker Delegation

Cada vez que se delegue trabajo a un worker o subagente, este debe **cargar primero la skill `code-organization`** antes de analizar, modificar o crear código.

La skill debe considerarse parte obligatoria del contexto de implementación para cualquier tarea delegada relacionada con estructura, componentes, módulos, refactors o creación de archivos.

## Modules

Organizar las features principales dentro de:

```text
src/
├── modules/
│   ├── auth/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── home/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── catalog/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── product/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── cart/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── checkout/
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── orders/
│   │   ├── pages/
│   │   └── components/
│   │
│   └── account/
│       ├── pages/
│       └── components/
│
```

### Module responsibilities

* `auth`: login y registro.
* `home`: inicio, promociones, categorías y compras frecuentes.
* `catalog`: catálogo, búsqueda, categorías

