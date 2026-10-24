# Consulta Expediente Médico - Project Context

## Overview
Sistema web independiente para consultar expedientes médicos del CECC SSC CDMX.
Arquitectura MVC con Express.js, Handlebars y MySQL.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Template Engine**: Handlebars (hbs)
- **Database**: MySQL (mysql)
- **Auth**: Passport (passport-local)
- **PDF**: Puppeteer (usa Chrome/Edge del sistema o Chromium incluido)
- **Upload**: Multer
- **CSS**: Custom CSS with design system (CSS variables)
- **Icons**: FontAwesome
- **Fonts**: Inter (Google Fonts)

## Project Structure (MVC)
```
D:\Dev\cdmx\consultaExpedienteMedico\
├── package.json
├── src/
│   ├── index.js                        # Entry point (puerto 3001)
│   ├── controllers/                    # Lógica de negocio
│   │   ├── authController.js           # Login/logout
│   │   ├── consultaController.js       # Búsqueda, expediente, PDF, CRUD
│   │   └── adminController.js          # Gestión usuarios
│   ├── models/                         # Acceso a datos
│   │   ├── User.js                     # CRUD usuarios + roles
│   │   ├── Expediente.js               # Consultas expediente + CRUD
│   │   └── Parametro.js                # Parámetros de configuración
│   ├── routes/                         # Definición de rutas
│   │   ├── auth.js                     # Login/logout
│   │   ├── consulta.js                 # Búsqueda, expediente, PDF, documentos
│   │   └── admin.js                    # Gestión usuarios
│   ├── database/
│   │   ├── keys.js                     # consulta_expediente DB config
│   │   ├── newKeys.js                  # vlifedb config
│   │   ├── expedienteMedicoKeys.js     # historia_clinica_db config
│   │   ├── sicocKeys.js                # peecc_lazaro config (SICOC externo)
│   │   ├── database.js                 # consulta_expediente pool
│   │   ├── newDatabase.js              # vlifedb pool
│   │   ├── expedienteMedicoDatabase.js # historia_clinica_db pool
│   │   ├── sicocDatabase.js            # peecc_lazaro pool
│   │   ├── run_migration.js            # Migration usuarios
│   │   ├── run_migration_parametros.js # Migration parámetros
│   │   ├── run_migration_observaciones.js # Migration observaciones
│   │   ├── run_migration_exploracion_fisica.js # Migration exploración física
│   │   ├── run_migration_somatometria.js # Migration somatometría
│   │   ├── run_migration_roles.js      # Migration catálogo roles
│   │   ├── run_migration_usuarios_roles.js # Migration usuarios→roles
│   │   ├── run_migration_usuario_propietario.js # Migration id_usuario en tablas
│   │   ├── run_migration_clave_usuario.js # Migration clave en tbl_usuarios
│   │   ├── run_migration_responsable.js # Migration id_responsable en tbl_expediente_finalizado
│   │   ├── run_migration_enlace_sicoc.js # Migration tbl_enlace_sicoc
│   │   └── run_migration_antecedentes_patologicos.js # Migration checkboxes patológicos
│   ├── lib/
│   │   ├── auth.js                     # isLoggedIn, checkRole middleware
│   │   └── passport.js                 # Passport local strategy
│   ├── views/
│   │   ├── layouts/main.hbs
│   │   ├── partials/
│   │   │   ├── navegacion.hbs
│   │   │   └── mensajes.hbs
│   │   ├── auth/login.hbs
│   │   ├── consulta/
│   │   │   ├── index.hbs               # Formulario búsqueda
│   │   │   ├── resultados.hbs          # Lista resultados (max-width: 1200px)
│   │   │   └── expediente.hbs          # Vista completa con tabs
│   │   └── admin/
│   │       └── usuarios.hbs            # Gestión usuarios
│   └── public/
│       ├── css/style.css               # Design system completo
│       ├── img/logo_cdmx_2026.png      # Logo institucional
│       └── js/
│           ├── main.js                 # Modales, alertas (sicocModal excluido)
│           └── theme.js                # Dark/light mode toggle
```

## Databases
- **consulta_expediente**: Usuarios, autenticación, parámetros, roles, tbl_enlace_sicoc
- **vlifedb**: Datos de evaluaciones y usuarios (solo lectura)
- **historia_clinica_db**: Expedientes médicos (lectura/escritura)
- **peecc_lazaro**: SICOC externo (consulta para verificar evaluaciones)

## Authentication & Roles

### Users Table (consulta_expediente.tbl_usuarios)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_usuario | INT PK | Auto-increment |
| username | VARCHAR(50) | Unique, login |
| password | VARCHAR(255) | bcrypt hash |
| nombre | VARCHAR(100) | Nombre completo |
| clave | VARCHAR(50) | Clave del empleado |
| id_rol | INT | FK a tbl_roles |
| activo | TINYINT(1) | Soft delete |
| creado | TIMESTAMP | Fecha creación |

### Roles (consulta_expediente.tbl_roles)
| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | administrador | Administrador del sistema |
| 2 | director | Director |
| 3 | subdirector | Subdirector |
| 4 | jefe_departamento | Jefe de Departamento |
| 5 | supervisor | Supervisor |
| 6 | evaluador | Evaluador |

### Permisos por Rol
| Función | Admin | Director | Subdirector | Jefe Depto | Supervisor | Evaluador |
|---------|-------|----------|-------------|------------|------------|-----------|
| Login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buscar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver Expediente | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Descargar PDF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Finalizar Expediente | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Liberar Expediente | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gestionar Usuarios | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## SICOC Integration

### Conexión peecc_lazaro
- **Host**: 10.13.86.23
- **User**: lzrpeecc
- **Database**: peecc_lazaro

### Tabla tbl_enlace_sicoc (consulta_expediente)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INT PK | Auto-increment |
| id_eval | INT NOT NULL | ID de evaluación |
| evalConsecutivo | VARCHAR(50) NULL | Número de evaluación SICOC |
| eActivo | TINYINT(1) | Soft delete |
| creado | TIMESTAMP | Fecha creación |
| modificado | TIMESTAMP | Fecha modificación |

### Flujo de enlace SICOC
1. **Al abrir expediente**: Busca `evalConsecutivo` en `vlifedb.tbl_enlace_sicoc` → `consulta_expediente.tbl_enlace_sicoc`
2. **Si tiene consecutivo**: Busca datos en SICOC y los muestra
3. **Si NO tiene**: Muestra modal para ingresar número
4. **Verificar**: Consulta SICOC con query y muestra datos para confirmar
5. **Confirmar**: Persiste en `consulta_expediente.tbl_enlace_sicoc`
6. **Modal no se puede cerrar**: Sin botón X, sin clic fuera, sin Escape

### Query SICOC
```sql
SELECT empleados.empNombreCompleto, evaluacion.evalConsecutivo, 
       evaluacion.evalNumEmpleado, subprograma.spgClave, 
       evaluacion.evalAdscripcion, cargos.cgCargo
FROM nb_empleado_evaluacion evaluacion
INNER JOIN nb_cat_empleados empleados ON empleados.empID = evaluacion.empID
INNER JOIN nb_cat_subprogramas subprograma ON subprograma.spgID = evaluacion.spgID
INNER JOIN nb_cat_cargos cargos ON cargos.cgID = evaluacion.cgID
WHERE evalConsecutivo = ?
```

## Búsqueda
- **Campos**: Nombre, número de empleado, número de evaluación SICOC
- **Query**: Busca en `consulta_expediente.tbl_enlace_sicoc` y `vlifedb.tbl_enlace_sicoc`
- **Resultados**: Muestra columna "No. Evaluación" (verde si enlazado, gris si sin enlazar)
- **Ancho tabla**: max-width 1200px para mostrar todos los datos

## Routes

### Consulta (`src/routes/consulta.js`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/consulta` | Formulario búsqueda |
| GET | `/consulta/buscar?nombre=X` | Resultados |
| GET | `/consulta/expediente/:id_eval` | Ver expediente |
| GET | `/consulta/expediente/:id_eval/pdf` | Descargar PDF |
| GET | `/consulta/sicoc/verificar/:evalConsecutivo` | Verificar en SICOC |
| POST | `/consulta/expediente/:id_eval/enlazar-sicoc` | Enlazar evaluación |
| POST | `/consulta/expediente/:id_eval/tatuajes/tiene` | Actualizar tiene_tatuaje |
| POST | `/consulta/expediente/:id_eval/tatuajes/observaciones` | Guardar observaciones tatuajes |
| POST | `/consulta/expediente/:id_eval/observaciones` | Guardar observación antecedentes |

## Models

### Expediente (`src/models/Expediente.js`)
- `searchByName(nombre)` - Buscar por nombre, empleado o evalConsecutivo
- `getEnlaceSicoc(id_eval)` - Busca en vlifedb → consulta_expediente
- `buscarEvaluacionSicoc(evalConsecutivo)` - Consulta SICOC externo
- `getExpedienteCompleto(id_eval)` - Expediente completo con datosSicoc y observaciones
- `syncDatosGenerales(id_eval, evaluado, id_usuario)` - Solo si no existe registro
- `saveTatuajeObservaciones(id_eval, observaciones, id_usuario)` - Guardar observaciones tatuajes
- `updateTieneTatuaje(id_eval, tiene_tatuaje, id_usuario)` - Actualizar tiene_tatuaje

## Handlebars Helpers
- `eq` - Comparación igualdad
- `or` - OR lógico
- `json` - Serializar a JSON
- `formatDate` - Formato fecha es-MX
- `tamanoACm` - Convertir tamaño tatuaje a cm (PEQUEÑO→<10 cm, MEDIANO→10-20 cm, GRANDE→20-40 cm, MUY_GRANDE→>40 cm)

## Views

### Expediente (`consulta/expediente.hbs`)
- **Header**: Nombre · Año · Tipo · ID
- **Tab: Antecedentes** - "Historia Clínica" + Heredo, NoPat, Accidentes, Patológicos, Sexual
  - Patológicos incluye:
    - ¿Consume medicamentos? (SI/NO + textarea)
    - ¿Tiene alergias? (SI/NO + textarea)
    - **Antecedentes Patológicos Adicionales** (7 checkboxes con textareas):
      - Antecedentes traumatólogicos o quirúrgicos
      - Consumo de medicamentos controlados
      - Enfermedades y alteraciones cardiorespiratorias
      - Enfermedades endocrinológicas
      - Alteraciones músculo esqueléticas
      - Otros
      - Ninguno (desmarca todos)
  - **Botón "Guardar Antecedentes"** al final del tab (guarda datos + observaciones)
- **Tab: Tatuajes** - Select "¿Tiene tatuajes?" (SI/NO), SVG body maps, CRUD, editor observaciones
- **Tab: Documentación** - Upload PDF
- **Tab: Exploración Física** - Interrogatorio + Habitus exterior
- **Tab: Somatometría** - Signos vitales, resultados, IMC con clasificación

### Datos Generales (orden)
1. Número de evaluación (SICOC readonly)
2. Nombre (SICOC readonly)
3. No. Empleado (SICOC readonly)
4. Subprograma (SICOC readonly)
5. Adscripción (SICOC readonly)
6. Cargo (SICOC readonly)
7. RFC (editable)
8. Género (editable)
9. Edad (editable)
10. Fecha de Nacimiento (editable)
11. Estado Civil (editable)
12. Escolaridad (editable)
13. Teléfono (editable)

### Clasificación IMC
| IMC | Categoría | Indicador |
|-----|-----------|-----------|
| < 18.5 | Peso bajo | ⚠️ Amarillo |
| 18.5 - 24.99 | Peso normal | ✅ Verde |
| 25 - 29.99 | Sobrepeso | ⚠️ Amarillo |
| 30 - 34.99 | Obesidad grado I | 🔴 Rojo |
| 35 - 39.99 | Obesidad grado II | 🔴 Rojo |
| ≥ 40 | Obesidad grado III | 🔴 Rojo |

### Modal SICOC
- **Paso 1**: Ingreso número + Verificar
- **Paso 2**: Confirmación datos (Nombre, No. Empleado, Consecutivo, Subprograma, Adscripción, Cargo)
- **Paso 3**: Éxito
- **No se puede cerrar**: Sin botón X, sin clic fuera, sin Escape

## PDF Generation

### Configuración de navegador
- **Función**: `getBrowserPath()` en `consultaController.js`
- **Detección automática**:
  1. Chrome (64-bit): `C:\Program Files\Google\Chrome\Application\chrome.exe`
  2. Chrome (32-bit): `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
  3. Edge (32-bit): `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
  4. Edge (64-bit): `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
  5. Fallback: Chromium incluido con Puppeteer
- **Args**: `--no-sandbox`, `--disable-setuid-sandbox`
- **Logging**: Muestra qué navegador se está usando

### Orden de secciones
1. Datos Generales (SICOC primero, luego editables)
2. Historia Clínica (subsecciones en negrita + observaciones en azul)
   - Antecedentes Patológicos Adicionales (si/no por cada opción)
3. Tatuajes (mapas SVG + tabla con tamaño en cm)
4. Somatometría / Estado Nutricional / Signos Vitales / Agudeza Visual / Exploración / Síntesis Técnica / LOC
5. Exploración Física (Interrogatorio + Habitus Exterior)
6. RESULTADOS (Resultado, Resultado LOC)
7. Documentación Médica
8. FIRMAS (Evaluador, Supervisor, Responsable con claves)

### Firmas
| Firma | Fuente |
|-------|--------|
| Evaluador | `id_usuario_propietario` → `tbl_usuarios.clave` |
| Supervisor | `tbl_expediente_finalizado.id_usuario` → `tbl_usuarios.clave` |
| Responsable | `tbl_expediente_finalizado.id_responsable` → `tbl_usuarios.clave` |

### Estilo
- **Logo**: `src/public/img/logo_cdmx_2026.png` (base64)
- **Tamaño letra**: 12px body, 16px títulos, 14px secciones
- **Subsecciones Historia Clínica**: Negrita, azul, uppercase
- **Observaciones**: Fondo azul claro, borde izquierdo azul
- **Tablas tatuajes**: Tamaño mostrado en cm

## Finalización de Expediente

### Estado actual
- `tbl_expediente_finalizado` almacena: `id_eval`, `fecha_finalizacion`, `id_usuario`, `id_responsable`, `activo`
- **Finalizar**: Solo admin/director/subdirector/jefe_depto/supervisor
- **Liberar**: Solo admin/director/subdirector/jefe_depto
- **Leyenda "Finalizado"**: Muestra fecha cuando se hizo clic en Finalizar
- **Bloqueo**: Al finalizar, deshabilita todos los campos de edición

## Commands
```bash
# Instalar dependencias
npm install

# Ejecutar migraciones
node src/database/run_migration.js
node src/database/run_migration_parametros.js
node src/database/run_migration_observaciones.js
node src/database/run_migration_exploracion_fisica.js
node src/database/run_migration_somatometria.js
node src/database/run_migration_roles.js
node src/database/run_migration_usuarios_roles.js
node src/database/run_migration_usuario_propietario.js
node src/database/run_migration_clave_usuario.js
node src/database/run_migration_responsable.js
node src/database/run_migration_enlace_sicoc.js
node src/database/run_migration_antecedentes_patologicos.js

# Iniciar servidor
npm run dev
```

## Puerto
- **3001**

## Notes
- Logo: `src/public/img/logo_cdmx_2026.png` en favicon, navbar, login, PDF
- Modal SICOC no se cierra (excluido en main.js)
- `syncDatosGenerales` solo crea registro si no existe (no sobreescribe)
- Guardar datos generales solo envía campos editables (sin nombre, sin num_empleado)
- Tooltip RT-09 con información del formato
- Búsqueda muestra resultados en tabla ancha (1200px)
- Tatuajes: select SI/NO controla visibilidad de contenido
- Tabla tatuajes muestra tamaño en cm (helper `tamanoACm`)
- PDF: Documentación Médica después de RESULTADOS, antes de FIRMAS
- Botón "Guardar Antecedentes" guarda datos + observaciones de todas las secciones
- Antecedentes Patológicos Adicionales: 7 checkboxes con textareas de observaciones
- IMC: 6 categorías (Peso bajo, Peso normal, Sobrepeso, Obesidad I/II/III)
- PDF: Clasificación IMC muestra rango + categoría