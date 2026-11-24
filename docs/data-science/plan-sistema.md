# Plan del sistema de análisis de datos (v1)

## 0. Decisiones de partida

| Tema | Decisión | Consecuencia |
|---|---|---|
| Tipos de datos | Todos (genérico, sin dominio fijo) | El perfilado y las sugerencias deben ser agnósticos al negocio |
| Origen | Solo CSV (v1) | Ingesta por subida de fichero; conectores (APIs, BD, Google Analytics) quedan para v2 |
| Usuarios | Analistas (SQL/Python) y perfiles de negocio sin código | Dos modos de uso: "guiado" (por defecto) y "avanzado" (SQL, código) |
| Prioridad | Todo: entender datos, dashboards, predicciones | Se construye por fases (sección 7) para no bloquear el resto |
| Datos personales | No | Se simplifica el cumplimiento en v1. Aun así, se incluye un detector de posibles datos personales (emails, teléfonos, DNI) que avisa si aparecen, por si cambia el caso |
| Plataforma de construcción | Lovable (stack por defecto: React + Tailwind + Supabase) | Ver sección 6: limitaciones de cálculo en el navegador y en el backend |

---

## 1. Objetivo en una frase

> Subes un CSV y, en minutos, el sistema te dice **qué contienen los datos, qué problemas tienen, cómo se relacionan sus columnas, qué merece la pena mirar y qué se puede predecir**, explicando cada conclusión y mostrando cómo se calculó.

---

## 2. Principios de diseño

1. **Mostrar el trabajo.** Cada número o conclusión enlaza con el cálculo que lo produce.
2. **Avisar antes que responder.** Si los datos tienen problemas (nulos, duplicados, valores imposibles), se muestran antes de cualquier análisis.
3. **Correlación no es causalidad.** Toda relación detectada incluye esta advertencia.
4. **Explicar en lenguaje llano.** Cada métrica tiene un "¿qué significa?" que enlaza con el glosario de la guía.
5. **Determinista primero, IA después.** Las estadísticas y las alertas se calculan con reglas auditables. La IA solo redacta explicaciones y traduce preguntas a consultas, y siempre muestra la consulta.
6. **No inventar.** Si una columna no permite un análisis, el sistema lo dice en lugar de forzarlo.

---

## 3. Flujo de usuario

```
Subir CSV → Vista previa y revisión del tipo de cada columna
          → Perfil automático + puntuación de calidad
          → Panel "Resumen" (qué son los datos y qué mirar primero)
          → Explorar: gráficos, relaciones, outliers
          → Preguntar (lenguaje natural o SQL) → resultado + consulta visible
          → Predecir (opcional, con guía) → métricas con explicación
          → Guardar en dashboard / exportar informe
```

---

## 4. Módulos funcionales

### M1. Ingesta de CSV
- Arrastrar y soltar, o seleccionar fichero. Límite inicial: 50 MB (ajustable).
- Detección automática de separador (`,` `;` `\t`), codificación (UTF-8, Latin-1) y cabecera.
- Vista previa de 50 filas y confirmación antes de procesar.
- Versionado: subir de nuevo el mismo fichero crea una versión y permite comparar.

**Criterio de aceptación:** un CSV con `;` y codificación Latin-1 se carga bien sin configurar nada.

### M2. Tipos y diccionario de datos
- Inferencia de tipo por columna: numérica, entera, categórica, ordinal (sugerida), fecha, texto libre, booleana, ID (valores casi todos únicos).
- El usuario puede **corregir el tipo** (p. ej. un código postal leído como número) y escribir la **descripción** de cada columna. Se guarda como diccionario.

**Criterio:** cambiar un tipo recalcula el perfil de esa columna.

### M3. Perfilado automático
Para cada columna:
- Nº de filas, % de nulos, nº de valores únicos, valores más frecuentes.
- Numéricas: mínimo, máximo, media, mediana, desviación típica, percentiles (p1, p5, p25, p75, p95, p99), asimetría.
- Fechas: rango, huecos temporales, frecuencia detectada (diaria, semanal…).
- Categóricas: distribución y categorías raras.

**Criterio:** los valores coinciden con una referencia (p. ej. pandas o DuckDB) en un dataset de prueba.

### M4. Puntuación de calidad y alertas
Reglas con severidad (Alta / Media / Baja):
- Nulos > 20 % (media) o > 50 % (alta).
- Filas duplicadas exactas.
- Columnas constantes (una sola valor).
- Valores fuera de rango "imposible" (edades > 120, fechas futuras, negativos donde no tiene sentido).
- Posibles inconsistencias de texto ("España" / "ESPAÑA" / "espana").
- Outliers por regla IQR (1,5 × rango intercuartílico), mostrados, no eliminados.
- Posibles datos personales (email, teléfono, DNI, IBAN) → aviso.

Puntuación global 0–100 con explicación de qué la ha bajado.

**Criterio:** cada alerta indica columna, número de filas afectadas y un ejemplo.

### M5. Estructura y relaciones
- **Matriz de correlación** entre numéricas, con advertencia de causalidad.
- **Asociaciones** entre categóricas (V de Cramér) y entre categórica y numérica.
- **Claves candidatas**: columnas con valores únicos.
- **Dependencias**: si una columna determina a otra (ej. ciudad → provincia).
- Solo con más de N filas (p. ej. 30) se muestran correlaciones, para evitar conclusiones de muestras pequeñas.

### M6. Gráficos automáticos
Sugerencias según el tipo de columna (una pregunta por gráfico):
- Histograma y diagrama de caja → distribución.
- Dispersión → relación entre dos numéricas.
- Serie temporal → evolución (con agregación por día/semana/mes).
- Barras → comparar categorías (top N, resto agrupado).

Filtros globales y segmentación por categoría.

### M7. Dashboards
- Tarjetas KPI (suma, media, recuento, % de cambio vs periodo anterior).
- Colección de gráficos guardados, filtros compartidos.
- Plantilla "Resumen automático" generada desde el perfil.
- Compartir en modo solo lectura.

### M8. Consultas: SQL y lenguaje natural
- **Editor SQL** sobre el CSV (tabla llamada según el fichero). Historial de consultas.
- **Lenguaje natural → SQL**: la IA propone la consulta, la muestra, la explica en una frase y pide confirmar antes de ejecutar. Permite editarla.
- Resultado siempre acompañado de la consulta usada.

**Criterio:** para 20 preguntas de prueba, la consulta generada da el resultado esperado en al menos 85 %. Las que fallen quedan marcadas como "revisar".

### M9. Insights en lenguaje natural
- Motor de reglas que genera frases como: "La columna *ventas* tiene una mediana de 120 € pero una media de 340 €: hay pocos pedidos muy grandes que la elevan." Cada frase enlaza con su cálculo.
- Opcional: la IA redacta un resumen ejecutivo a partir de los insights ya calculados (sin inventar cifras nuevas).

### M10. Predicciones (guiadas)
- Elegir variable objetivo y el sistema propone el tipo de problema (regresión si es número, clasificación si es categoría).
- Modelos base: regresión lineal / logística, árbol de decisión. Más modelos en v2.
- Separación entrenamiento / prueba automática (80/20) y validación cruzada si hay pocas filas.
- Métricas explicadas en lenguaje llano:
  - Clasificación: exactitud, precisión, recall, F1, y aviso si las clases están desbalanceadas.
  - Regresión: error medio absoluto, R².
- Comparación con un modelo "ingenuo" (predecir siempre la media o la clase mayoritaria). Si el modelo no lo supera, se avisa.
- Importancia de variables con advertencia de que no es causa.

### M11. Exportación y trazabilidad
- Informe en PDF o HTML con gráficos, alertas y decisiones tomadas.
- Exportar CSV de cualquier resultado y la consulta SQL usada.
- Registro de cambios: quién cambió el tipo de una columna o la descripción, y cuándo.

### M12. Ayuda integrada
- Glosario con las definiciones de la guía (media, mediana, nulo, correlación, sobreajuste…).
- Cada alerta o métrica tiene un botón "¿qué significa?".

---

## 5. Pantallas (v1)

1. **Inicio**: lista de datasets, botón "Subir CSV".
2. **Revisión de ingesta**: vista previa y tipos de columna.
3. **Resumen**: puntuación de calidad, alertas principales, "qué mirar primero".
4. **Explorar**: columnas (lista + perfil), gráficos sugeridos, relaciones.
5. **Consultar**: lenguaje natural o SQL, con resultado y consulta visibles.
6. **Predecir**: asistente de 4 pasos (objetivo → modelo → resultados → interpretación).
7. **Dashboards**: lista y editor.
8. **Diccionario y configuración**: tipos, descripciones, historial.

---

## 6. Arquitectura propuesta y limitaciones

### Stack
- **Frontend**: React + Tailwind + componentes de Lovable (shadcn/ui). Gráficos con Recharts o Plotly.
- **Backend**: Supabase (Postgres para metadatos, Storage para CSV, Edge Functions para lógica de servidor y llamadas a IA).
- **Cálculo**:
  - Perfilado, reglas de calidad y gráficos: en el navegador con JavaScript (rápido, sin coste de servidor) para ficheros pequeños/medianos, o en una Edge Function para más volumen.
  - SQL sobre el CSV: **DuckDB-WASM** en el navegador es la opción recomendada (SQL analítico real sin servidor). A validar en Lovable.
  - Modelos de ML: regresión, logística y árboles con una librería JS (p. ej. ml-regression, ml-random-forest) para v1. Para modelos más potentes hará falta un servicio Python (Edge Function externa o contenedor), que queda para v2.
- **IA**: se llama desde Edge Functions con una clave guardada como secreto de Supabase (nunca en el frontend).

### Limitaciones que hay que conocer
- Lovable genera el código de la app; **no ejecuta Python** en el navegador. Por eso el ML de v1 es básico.
- CSV grandes (> 50 MB) en el navegador pueden ir lentos: habrá que procesarlos por bloques o en servidor.
- Las respuestas de IA pueden equivocarse: por eso la consulta siempre se muestra y se puede editar.
- Coste: cada consulta de IA y cada generación en Lovable consume créditos. Conviene fijar un presupuesto antes de empezar.

---

## 7. Fases de construcción

| Fase | Contenido | Resultado para el usuario |
|---|---|---|
| **F0** | Dataset de prueba (p. ej. Titanic, ventas de ejemplo), glosario, datos de referencia para validar cálculos | Base de pruebas |
| **F1** | M1 Ingesta, M2 Tipos y diccionario, M3 Perfilado, M4 Calidad | Subir un CSV y ver qué contiene y qué le pasa |
| **F2** | M5 Relaciones, M6 Gráficos, M7 Dashboards, M12 Ayuda | Explorar visualmente y guardar paneles |
| **F3** | M8 SQL y lenguaje natural, M11 Exportación | Preguntar a los datos |
| **F4** | M9 Insights, M10 Predicciones básicas | Conclusiones automáticas y primeros modelos |
| **F5** | Versionado avanzado, colaboración, conectores (v2) | Trabajo en equipo |

Cada fase termina con pruebas contra el dataset de referencia y con revisión de que las explicaciones se entienden sin conocimientos previos.

---

## 8. Prompt inicial para Lovable (F1)

> Crea una aplicación web para analizar archivos CSV pensada para analistas y para personas sin conocimientos técnicos. Pantallas: Inicio (lista de datasets y botón "Subir CSV"), Revisión de ingesta (vista previa de 50 filas, detección automática de separador y codificación, y para cada columna un selector de tipo: numérica, entera, categórica, fecha, texto, booleana, ID), y Resumen.
>
> En Resumen muestra: puntuación de calidad 0–100 con explicación; lista de alertas con severidad (alta, media, baja), columna, número de filas afectadas y un ejemplo: nulos >20 % (media) y >50 % (alta), filas duplicadas, columnas constantes, valores imposibles, outliers por regla IQR (1,5 × rango intercuartílico) sin eliminarlos, y posibles datos personales (email, teléfono, DNI, IBAN).
>
> Para cada columna numérica muestra: mínimo, máximo, media, mediana, desviación típica, percentiles p1/p5/p25/p75/p95/p99 y asimetría, con un histograma y diagrama de caja. Para categóricas, distribución y top 10. Cada métrica debe tener un botón "¿qué significa?" con una explicación en lenguaje sencillo.
>
> Guarda los datasets en Supabase (metadatos en Postgres, archivo en Storage) y el diccionario de columnas editable (tipo y descripción), con historial de cambios. Usa un diseño limpio y accesible, con textos en español, y que funcione bien en móvil.

Después se añadirán las fases F2–F4 con prompts propios.

---

## 9. Pendiente antes de empezar en Lovable

1. Confirmar el presupuesto de créditos de Lovable y de IA.
2. Elegir el dataset de prueba (si no, usamos el Titanic).
3. Confirmar que la primera entrega es F1 (ingesta, perfilado y calidad).
