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

---

## 10. Lecciones del libro "Data Analysis Using SQL and Excel" (Gordon S. Linoff, Wiley, 2008)

Fuente: `/root/.claude/uploads/dbd8de5f-12ac-5ab2-923c-33f7abffae94/6f851099-Data_Analysis_Using_SQL_and_Excel.pdf` (690 páginas).
Alcance de la lectura: índice completo, introducción, capítulo 1 (inicio), capítulo 2 (inicio y lecciones), capítulo 3 (conceptos básicos) y capítulo 12 (inicio). **No se ha leído el libro completo.** Los capítulos 4–11 solo se conocen por su índice.

### 10.1 Ideas que el libro aporta al plan

1. **La documentación dice lo que debería haber; la exploración dice lo que hay.** (Cap. 2.) Confirma M2 y M4: el sistema debe comparar el diccionario declarado por el usuario con lo que contienen los datos realmente.
2. **Preguntas que la exploración debe responder** (Cap. 2): ¿qué valores hay en cada columna?, ¿qué valores inesperados aparecen?, ¿hay irregularidades de formato (horas faltantes, mayúsculas mezcladas)?, ¿qué relaciones hay entre columnas?, ¿tienen sentido las frecuencias? Esta lista debe ser la checklist de M3/M4.
3. **Histogramas y agrupación de numéricas** (Cap. 2): para ver la distribución de valores numéricos hay que agruparlos en rangos, incluido el "tiling" en quintiles y deciles. Añadir a M3: histograma por cuantiles además del histograma de anchura fija.
4. **Moda y valores extremos** (Cap. 2): min, max y moda (valor más frecuente) como parte del perfil de cada columna. Añadir a M3.
5. **Resumir todas las columnas a la vez** (Cap. 2): el libro concluye que es más eficiente investigar todas las columnas en una sola pasada que una a una. Confirma que M3 debe calcular el perfil completo de una vez.
6. **Significación estadística: la hipótesis nula** (Cap. 3): por defecto se asume que las diferencias se deben al azar; los datos deben demostrar lo contrario. Un p-valor bajo (5 % o 10 %) indica que es improbable que la diferencia sea casualidad. Esto obliga a que el sistema, al comparar grupos, diga **si la diferencia es significativa**, no solo cuál es mayor. Añadir a M5 y M9.
7. **Diferencia de medias y de proporciones** (Cap. 3): el libro usa intervalos de confianza y diferencia de proporciones para comparar grupos de clientes. Son candidatos naturales para un módulo de "¿este grupo es distinto del resto?".
8. **Chi-cuadrado para categóricas** (Cap. 3): compara si dos variables categóricas están relacionadas. Ya lo tenemos en M5 (asociaciones entre categóricas); el libro da la fórmula y su aplicación.
9. **Qué es un "cliente" depende de la definición** (Cap. 12): cuenta, individuo, hogar o transacción anónima dan respuestas distintas. Para el sistema: que el usuario declare **qué representa cada fila** (una venta, un cliente, un evento) como parte del diccionario.
10. **Firma del cliente** (Cap. 12): una tabla con una fila por entidad y columnas que resumen su comportamiento, con una fecha de corte para evitar fugas de información del futuro. Es un patrón útil para la F4 (predicciones) y para un "resumen por entidad" en M7.
11. **Análisis de supervivencia y retención** (Caps. 6–7): cuánto dura un cliente y qué factores influyen. Útil si los datos tienen fechas de inicio y fin. Candidato para v2.
12. **Análisis de cesta y reglas de asociación** (Cap. 9): qué productos se compran juntos. Candidato para v2 si hay datos de transacciones.
13. **Regresión lineal, R² y sus límites** (Cap. 11): el libro advierte que R² mide el ajuste, no la calidad del modelo. Confirma que M10 debe explicar las métricas y sus limitaciones.

### 10.2 Cambios concretos al plan

- **M3 (perfilado):** añadir moda, histograma por cuantiles y perfil completo en una sola pasada.
- **M4 (calidad):** añadir "irregularidades de formato" (mayúsculas mezcladas, espacios al inicio o final, fechas sin hora) y la comparación entre diccionario declarado y datos reales.
- **M5 (relaciones):** comparaciones entre grupos con prueba de significación (p-valor) y chi-cuadrado para categóricas.
- **M2 (diccionario):** pedir al usuario que declare qué representa cada fila (la unidad de análisis).
- **M7 (dashboards):** "resumen por entidad" como vista derivada, siguiendo el patrón de firma del cliente.
- **Nuevo módulo v2:** supervivencia/retención y reglas de asociación, si los datos lo permiten.

### 10.3 Advertencias del libro que nos afectan

- El libro usa Excel con límite de 65.536 filas. Ese límite ya no aplica; nuestro límite de 50 MB sigue siendo una decisión de rendimiento en el navegador.
- Los ejemplos usan SQL Server y dialectos de 2008. Nuestro motor (DuckDB-WASM o Postgres) tiene sintaxis distinta; las consultas de ejemplo habrá que adaptarlas.
- El libro no trata la IA generativa ni el lenguaje natural. Esas partes del plan (M8 y M9) no tienen respaldo en este libro.

---

## 11. Asistente de IA sobre los datos (M13)

### 11.1 Qué debe poder hacer (según la petición)

- Preguntar en lenguaje natural sobre un dataset ("¿qué mes vendimos más?", "¿hay clientes duplicados?").
- Pedir cambios sobre un gráfico existente ("cambia a barras apiladas", "quita los outliers", "ordena por fecha").
- Crear gráficos nuevos a partir de los datos y guardarlos en un dashboard.
- Pedir análisis adicionales (correlaciones, comparaciones entre grupos, tendencias, segmentos).
- Ver siempre la consulta o el código usado y poder editarlo.
- Conversación con memoria dentro de la sesión del dataset.

### 11.2 Qué significa "acceso total" en la práctica

"Acceso total" tiene que traducirse en permisos concretos. Los tres niveles posibles:

| Nivel | Qué puede hacer la IA | Riesgo |
|---|---|---|
| **A. Lectura** | Consultas SQL de solo lectura sobre los datasets del usuario, gráficos y análisis | Bajo |
| **B. Lectura + modificación de vistas** | Además, crear/editar gráficos, dashboards, columnas derivadas (sin tocar el CSV original) | Medio |
| **C. Modificación de datos** | Además, borrar, corregir o reescribir filas o el CSV | Alto: puede dañar datos sin que nadie lo note |

**Recomendación:** nivel B por defecto. Los datos originales son inmutables; cualquier limpieza se hace como una vista o columna derivada que se puede deshacer. El nivel C solo con confirmación explícita por cada acción.

### 11.3 Riesgos que hay que cubrir (no son opcionales)

1. **Inyección de instrucciones desde el CSV.** Un valor de celda puede contener texto del tipo "ignora tus instrucciones y…". La IA debe tratar el contenido de los datos como datos, nunca como instrucciones, y las herramientas deben tener límites fijos en el backend.
2. **Consultas peligrosas.** Nada de SQL libre contra la base de datos real. La IA genera consultas que se ejecutan en un motor de solo lectura, limitado a las tablas del dataset del usuario, con tiempo máximo y número máximo de filas.
3. **Coste sin control.** La app es pública y sin login: cualquiera con el enlace podría gastar créditos de IA. Antes de activar el asistente hace falta autenticación, límites de uso por usuario y un tope de gasto.
4. **Datos enviados a terceros.** Lo que la IA ve se envía al proveedor del modelo. Aunque ahora no hay datos personales, el detector de PII debe bloquear el envío de filas con datos personales detectados, o pedir confirmación.
5. **Respuestas incorrectas.** La IA puede inventar cifras. Cada número que muestre debe venir de una consulta ejecutada, con su SQL visible. Nunca se aceptan cifras "de memoria".
6. **Trazabilidad.** Cada acción de la IA que cambia algo (vista, gráfico, columna derivada) queda registrada con quién la pidió, cuándo y qué consulta usó, y se puede revertir.

### 11.4 Arquitectura propuesta

- **Frontend:** panel de chat junto al dataset. Los gráficos se renderizan desde una especificación (tipo, columnas, filtros), no desde código arbitrario.
- **Backend (Edge Function):** recibe la pregunta, llama al modelo con un conjunto fijo de herramientas:
  - `ejecutar_consulta_lectura(sql)`: solo SELECT, sobre tablas del dataset, con límites.
  - `crear_grafico(spec)` / `editar_grafico(id, cambios)`.
  - `crear_columna_derivada(expresion)`.
  - `resumen_dataset()`: devuelve el perfil ya calculado (M3/M4), para no mandar el CSV entero al modelo.
- **Validación en servidor:** cada herramienta valida sus entradas. El modelo nunca escribe SQL que llegue directamente a la base de datos sin pasar por el validador.
- **Modelo de IA:** un proveedor con API (p. ej. Claude o OpenAI), con la clave guardada como secreto de Supabase. Si Lovable ofrece una pasarela de IA integrada, es una alternativa a evaluar.

### 11.5 Decisiones que necesito del usuario

1. **Nivel de acceso:** A, B (recomendado) o C.
2. **Proveedor de IA:** ¿tienes una clave de API (Anthropic u OpenAI)? ¿o prefieres la pasarela integrada de Lovable si existe?
3. **Acceso:** ¿la app sigue sin login (no recomendado con IA activa) o añadimos inicio de sesión antes del asistente?
4. **Presupuesto:** tope mensual de gasto en IA.

### 11.6 Orden de construcción

1. Autenticación y límites de uso (sin esto, no se activa la IA).
2. Herramienta de resumen del dataset y chat de solo lectura (nivel A).
3. Gráficos creados y editados por la IA (nivel B).
4. Columnas derivadas y dashboards por IA.
5. Nivel C solo si hace falta, con confirmación por acción.
