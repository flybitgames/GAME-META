# Guía de Data Science para principiantes (y base para el sistema)

Esta guía es el punto de partida. Explica qué es el trabajo con datos, qué roles existen, cómo se trabaja paso a paso y qué debería hacer un sistema para analistas. Está escrita para alguien sin formación en datos.

---

## 1. Qué es (y qué no es) data science

- **Dato**: un registro de algo que pasó o existe (una venta, un clic, una temperatura).
- **Análisis de datos**: mirar datos para entender qué pasó y por qué.
- **Data science (ciencia de datos)**: combinar estadística, programación y conocimiento del negocio para **entender**, **predecir** o **decidir** a partir de datos.

Regla de oro: **un número sin contexto no significa nada.** Antes de calcular nada hay que saber qué pregunta se quiere responder.

---

## 2. Los roles principales

| Rol | Pregunta que responde | Trabaja con | Herramientas típicas |
|---|---|---|---|
| **Data engineer** | ¿Cómo llegan los datos limpios y fiables a donde se necesitan? | Pipelines, bases de datos, almacenes | SQL, Python, Airflow, dbt, Spark |
| **Data analyst** | ¿Qué nos dicen los datos que ya tenemos? | Tablas, KPIs, dashboards, informes | SQL, Excel, Power BI / Tableau, Python básico |
| **Data scientist** | ¿Qué pasará y qué debemos hacer? | Modelos estadísticos y de machine learning | Python (pandas, scikit-learn), estadística, experimentos |
| **ML / AI engineer** | ¿Cómo pongo el modelo en producción? | Sistemas en tiempo real, APIs | Docker, cloud, MLOps |

Solapamientos: analista y científico comparten SQL, Python y comunicación de resultados. En la práctica los títulos varían mucho entre empresas.

**Para tu caso (un sistema para analistas)**, lo que más se parece es el trabajo del **analista + la parte exploratoria del científico de datos**.

*Fuente: IBM, "What's the Difference? Data Engineer vs Data Scientist vs Analytics Engineer" y DataCamp, "Data Analyst vs. Data Scientist" (búsqueda de 2026).*

---

## 3. El proceso de trabajo: CRISP-DM

El marco más usado para proyectos de datos tiene seis fases. **No son lineales**: se vuelve atrás constantemente.

1. **Entender el negocio**: ¿qué problema resolvemos? ¿Qué significa "éxito"?
2. **Entender los datos**: ¿qué datos hay, de dónde vienen, qué significan?
3. **Preparar los datos**: limpiar, unir, transformar. Suele ser **la mayor parte del trabajo** (se citan cifras de hasta ~75 %).
4. **Modelar**: aplicar técnicas (estadística, machine learning). En análisis descriptivo, esta fase puede ser simple.
5. **Evaluar**: ¿la respuesta sirve para el objetivo de negocio? ¿Es fiable?
6. **Desplegar**: poner el resultado en uso (un informe, un dashboard, una alerta, un modelo en producción).

*Fuente: CRISP-DM, explicado en Udacity (2025) y documentación de IBM SPSS Modeler.*

---

## 4. Conceptos básicos que hay que dominar

### 4.1 Tipos de variables
- **Numérica continua**: temperatura, importe (puede tomar cualquier valor).
- **Numérica discreta**: número de pedidos (enteros).
- **Categórica**: país, tipo de cliente (sin orden).
- **Ordinal**: nivel de satisfacción 1–5 (con orden).
- **Fecha/hora**: requiere tratamiento especial (estacionalidad, tendencias).
- **Texto libre**: comentarios, descripciones.

Un sistema útil **detecta el tipo automáticamente** y avisa si algo no encaja.

### 4.2 Estadística descriptiva (la base de todo)
- **Tendencia central**: media, mediana, moda. La **mediana** es más robusta a valores extremos.
- **Dispersión**: desviación estándar, rango, percentiles (p25, p75, p95).
- **Forma**: asimetría (*skewness*) y curtosis.
- **Valores atípicos (*outliers*)**: datos muy alejados del resto. Pueden ser errores o los casos más importantes.

### 4.3 Relaciones entre variables
- **Correlación**: cuánto se mueven dos variables juntas. Va de -1 a 1.
  - **Ojo**: correlación no es causalidad. Que los helados y los ahogamientos suban juntos no significa que uno cause el otro (ambos dependen del verano).
- **Tablas cruzadas y agregaciones**: ventas por región y mes, por ejemplo.

### 4.4 Calidad de datos (el problema número uno)
Los problemas típicos que hay que comprobar siempre:
- **Valores nulos (faltantes)**: ¿son aleatorios o hay un patrón? Investigarlos es un paso obligatorio del EDA.
- **Duplicados**.
- **Valores imposibles**: edades de 250 años, fechas en el futuro, precios negativos.
- **Inconsistencias**: "España", "ESPAÑA", "Spain" para lo mismo.
- **Cambios de definición** a lo largo del tiempo.
- **Sesgo de muestra**: los datos no representan la población que nos interesa.

### 4.5 Análisis exploratorio de datos (EDA)
Es la fase en la que el analista "conoce" los datos. Combina tres enfoques:
1. **Perfilado de datos**: resumen automático (tipos, nulos, distribuciones, cardinalidad).
2. **Estadísticas resumen**: como en 4.2.
3. **Visualización**: histogramas, diagramas de caja, dispersión, series temporales.

Se analiza cada variable **por separado** (univariante) y luego **las relaciones entre ellas** (multivariante).

### 4.6 Visualización
- Histograma → distribución de una variable.
- Diagrama de caja (*boxplot*) → dispersión y outliers.
- Gráfico de dispersión → relación entre dos numéricas.
- Serie temporal (línea) → evolución en el tiempo.
- Barras → comparar categorías.
- Mapa de calor → matriz de correlación o tablas cruzadas.

Regla: **un gráfico = una pregunta**.

### 4.7 Machine learning (solo lo necesario para empezar)
- **Aprendizaje supervisado**: tenemos la respuesta en el histórico (ej. "cliente se fue / no se fue") y entrenamos un modelo para predecirla.
  - **Clasificación**: categoría (sí/no, tipo de cliente).
  - **Regresión**: número (importe, demanda).
- **Aprendizaje no supervisado**: no hay respuesta. Se buscan grupos (*clustering*) o patrones.
- **Entrenamiento vs. prueba**: el modelo se evalúa con datos que **no** vio al entrenar. Si no, engaña.
- **Sobreajuste (*overfitting*)**: el modelo memoriza en vez de aprender. Suele ser el error más común de principiantes.

**Métricas básicas**:
- Clasificación: exactitud (*accuracy*), precisión, recall, F1. *Cuidado*: con clases desbalanceadas (ej. 99 % no fraude), la exactitud engaña.
- Regresión: error absoluto medio (MAE), error cuadrático medio (RMSE), R².

### 4.8 Experimentos y causalidad
- **Test A/B**: dividir usuarios al azar en dos grupos para medir si un cambio funciona de verdad.
- **Significancia estadística**: probabilidad de que un resultado sea fruto del azar. Un p-valor bajo no prueba un efecto grande ni importante.

### 4.9 Ética y gobernanza
- Datos personales (RGPD en Europa): minimizar, anonimizar, controlar acceso.
- **Sesgos**: un modelo entrenado con datos sesgados reproduce el sesgo.
- **Trazabilidad**: saber de dónde sale cada número.

---

## 5. Herramientas del oficio (resumen)

- **SQL**: consultar bases de datos. Imprescindible.
- **Python** (pandas, numpy, matplotlib/plotly, scikit-learn): análisis y modelos.
- **Notebooks** (Jupyter, Hex, Databricks): código y explicación juntos.
- **Perfilado automático**: ydata-profiling (Python), herramientas de calidad como Great Expectations o Soda.
- **BI / dashboards**: Power BI, Tableau, Looker.
- **Asistentes con IA**: NL-to-SQL (preguntar en lenguaje natural y generar SQL). Útiles, pero **hay que verificar** siempre el resultado.

---

## 6. Cómo debería ser un sistema útil para analistas

Basado en lo anterior, las funciones que más valor aportarían:

1. **Ingesta**: subir CSV/Excel o conectar bases de datos.
2. **Perfilado automático al instante**: tipos, nulos, duplicados, outliers, distribuciones, cardinalidad. Es el equivalente a "leer la ficha de los datos".
3. **Alertas de calidad**: nulos inusuales, valores imposibles, cambios respecto a cargas anteriores.
4. **Estructura y diccionario**: qué es cada columna, relaciones probables entre tablas, claves.
5. **Análisis guiado**: sugerencias de preguntas y gráficos según el tipo de datos ("esta serie tiene estacionalidad semanal", "estas dos variables están muy correlacionadas").
6. **Explicaciones en lenguaje natural**: traducir los hallazgos a frases comprensibles, con la advertencia de correlación vs. causalidad cuando aplique.
7. **Consultas en lenguaje natural → SQL/Python**, mostrando el código generado para que el analista pueda revisarlo.
8. **Trazabilidad**: cada conclusión enlaza con los datos y cálculos que la producen.
9. **Informes exportables** y reproducibles.

**Principio de diseño importante**: el sistema debe **mostrar su trabajo** (cálculos, supuestos, limitaciones). Un analista que no entiende de dónde sale un número no puede defenderlo.

---

## 7. Errores comunes que el sistema debería evitar o avisar

- Confundir correlación con causalidad.
- Usar la media con datos muy asimétricos sin avisar.
- Olvidar que los nulos pueden tener significado.
- Entrenar y evaluar con los mismos datos.
- Ignorar desbalance de clases.
- Sacar conclusiones de muestras muy pequeñas.
- Comparar periodos distintos sin ajustar (estacionalidad, inflación).

---

## 8. Ruta de aprendizaje recomendada (si quieres entender lo que hace el sistema)

1. **Estadística descriptiva** y tipos de variables (semana 1–2).
2. **SQL básico** → agregaciones, joins (semana 3–4).
3. **EDA completo** sobre un dataset público (semana 5–6).
4. **Visualización** con criterio (semana 7).
5. **Introducción a ML**: regresión y clasificación con validación correcta (semana 8–10).
6. **Ética, sesgos y calidad de datos** (transversal).

---

## 9. Preguntas para seguir trabajando

Para diseñar el sistema necesito que decidas (o me confirmes):

1. **¿Qué tipo de datos** vais a usar? (ventas, usuarios, juegos/métricas de jugadores, finanzas, encuestas...)
2. **¿De dónde vienen?** (ficheros CSV/Excel, base de datos, APIs, herramientas como Google Analytics o similares).
3. **¿Quién lo usará?** (analistas técnicos con SQL/Python, o perfiles de negocio sin código).
4. **¿Qué prioridad tiene?**: entender los datos (EDA automático), dashboards, predicciones, o todo.
5. **¿Datos personales?** Afecta a dónde se pueden procesar y guardar.

---

## Fuentes consultadas

- IBM, *What's the Difference? Data Engineer vs Data Scientist vs Analytics Engineer?* — https://www.ibm.com/think/topics/data-engineer-data-vs-data-scientist-vs-analytics-engineer
- DataCamp, *Data Analyst vs. Data Scientist: A Comparative Guide* — https://www.datacamp.com/es/blog/data-analyst-vs-data-scientist-a-comparative-guide
- The Data School, *Data Analyst vs. Data Scientist vs. Data Engineer* — https://thedataschool.co.uk/marcus-rocco/data-analyst-vs-data-scientist-vs-data-engineer-whats-the-difference-2/
- Udacity, *CRISP-DM Explained: A Proven Data Mining Methodology* (2025) — https://www.udacity.com/blog/crisp-dm-explained-a-proven-data-mining-methodology/
- KDnuggets, *A Data Scientist's Essential Guide to Exploratory Data Analysis* — https://www.kdnuggets.com/2023/06/data-scientist-essential-guide-exploratory-data-analysis.html
- IBM, *What is data profiling?* — https://ibm.com/think/topics/data-profiling
- Fast.io, *10 Best AI Data Analysis Agents in 2026 Compared* — https://fast.io/resources/best-ai-data-analysis-agents-2026/ (fuente comercial; sus comparativas no están verificadas)

*Nota: parte de los conceptos (estadística, ML, sesgos, métricas) es conocimiento general consolidado; las fuentes arriba cubren sobre todo los marcos de trabajo y el estado de las herramientas en 2026.*
