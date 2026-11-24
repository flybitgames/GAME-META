# Pendiente de enviar a Lovable: F8 (predicciones)

Enviar cuando el workspace tenga créditos. Proyecto: 2caff00b-b30a-4409-b830-cc8af397a817.

Texto a enviar:

Fase F8: predicciones con horizonte libre. Todo el texto en español. No cambies carpetas, relaciones, login, RLS, dashboards, enlaces de lectura ni las salvaguardas del asistente.

1. PREDICCIÓN DESDE LA INTERFAZ Y DESDE EL ASISTENTE
- En un dataset con columna de fecha y una columna numérica, botón "Predecir". El usuario elige: columna de fecha, columna a predecir (p. ej. importe), agregación (suma o media por día, semana o mes), filtro opcional (p. ej. ciudad = Valdeolivo) y horizonte libre (un número de periodos o una fecha final).
- En el asistente, en lenguaje natural: "¿cuánto se venderá en Valdeolivo los próximos 3 meses?" o "predice las ventas hasta diciembre de 2027". El asistente convierte la petición en esos parámetros, muestra el resumen y pide confirmación antes de calcular.
- El asistente también puede pedir un dashboard con la previsión. Muestra primero el resumen y guarda solo tras confirmación.

2. MÉTODO (en JavaScript, sin servicios externos)
- Serie agregada por el periodo elegido. Rellena los periodos sin datos con 0 solo si el usuario lo confirma; si no, los excluye y lo avisa.
- Método principal: Holt-Winters aditivo (tendencia y estacionalidad semanal o anual según datos suficientes). Respaldo con pocos datos: tendencia lineal simple. Si hay menos de 12 periodos, no muestres estacionalidad y avísalo.
- Intervalos del 80 % y 95 % a partir de los errores históricos del ajuste.

3. CÓMO SE MUESTRA
- Gráfico de líneas: histórico sólido, predicción discontinua, banda de incertidumbre sombreada.
- Valor previsto total y por periodo, con intervalo.
- Prueba hacia atrás: entrenar sin los últimos N periodos y comparar. Mostrar el MAPE traducido a lenguaje claro.
- Aviso visible si el horizonte supera la mitad del histórico, o si el MAPE supera el 25 %.
- Marcar, sin eliminar, cambios bruscos como posibles outliers.
- Guardar cada predicción como vista derivada con sus parámetros, para recalcularla y explicarla.

4. SEGURIDAD Y LÍMITES
- Solo el resultado numérico se pasa al asistente para explicarlo; el CSV no se envía al modelo.
- Con fecha no válida o menos de 6 periodos, no calcular y explicar por qué.
- Las predicciones cuentan como acciones del asistente: historial y deshacer.
- En dashboards compartidos por enlace de lectura, mostrar también el aviso de incertidumbre.

5. PRUEBA
- En "Naranjal S.A.", predecir el importe mensual de Valdeolivo para los próximos 3 meses. Comprobar gráfico, intervalo, prueba hacia atrás y aviso si corresponde.
- Pedir al asistente: "dashboard de previsión de ventas de Valdeolivo a 6 meses, con KPI del total previsto". Confirmar y comprobar que se crea.

Empieza por el cálculo y el gráfico. Después la prueba hacia atrás y los avisos. Después el asistente. Dime qué has probado y qué queda pendiente.
