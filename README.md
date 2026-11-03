# Estimación de la resistencia del concreto

Proyecto final de Machine Learning. Predice la resistencia a compresión de una muestra a partir de siete ingredientes y su edad. El usuario previsto es personal de laboratorio que necesita una estimación preliminar. No sustituye ensayos ni certifica estructuras.

- [Aplicación](https://cristiancabezas13.github.io/ProyectoFinal/)
- [Abrir notebook en Google Colab](https://colab.research.google.com/github/cristiancabezas13/ProyectoFinal/blob/main/model_development.ipynb)
- Notebook: `model_development.ipynb` (incluye código ejecutado, tablas, gráficas y justificación).

## Datos y preprocesamiento

Fuente: Yeh, I. (1998), *Concrete Compressive Strength*, UCI Machine Learning Repository, https://doi.org/10.24432/C5PK67. UCI publica el conjunto bajo CC BY 4.0. Se conserva el README original y su aviso de atribución.

El Excel contiene 1.030 filas y nueve columnas: ocho entradas numéricas y resistencia en MPa. Las siete cantidades de ingredientes se expresan en kg/m³ y la edad en días.

Se verificaron tipos, finitud, valores faltantes, signos y duplicados. No se encontraron faltantes. Se retiraron 25 copias exactas y se conservaron 1.005 filas. No se imputaron datos ni se eliminaron extremos solo por la regla IQR. Ceros en adiciones son válidos. No hacen falta codificación ni escalado para estos modelos de árboles.

## Evaluación y selección

Agrupamos por la combinación exacta de los siete ingredientes. Todas las edades de la misma receta quedan en una sola partición. Se reservó el 20 % de los grupos para prueba con semilla 42: entrenamiento con 810 filas y 342 recetas, prueba con 195 filas y 86 recetas. No hay recetas compartidas entre ambos conjuntos. El EDA que guía decisiones usa entrenamiento.

La selección usa validación cruzada de cinco particiones por grupos (`GroupKFold`) y menor MAE. La prueba no interviene en la búsqueda. Se compararon una referencia que predice la media, un árbol y Random Forest.

| Alternativa | MAE medio de validación (MPa) | Desviación entre particiones |
|---|---:|---:|
| Media | 13,217 | 0,707 |
| Árbol | 5,973 | 0,431 |
| Random Forest | 4,702 | 0,453 |

Se probaron `max_depth=[4,8,None]` y `min_samples_leaf=[2,5]`. El ganador fue Random Forest con 150 árboles, profundidad sin límite y un mínimo de dos muestras por hoja. Los 150 árboles se fijaron como presupuesto de cómputo; no se afirma que sean un óptimo. Se conserva `max_features=1.0`: cada división considera todas las variables y la diversidad proviene principalmente del muestreo bootstrap.

| Evaluación final | MAE (MPa) | RMSE (MPa) | R² |
|---|---:|---:|---:|
| Random Forest: entrenamiento | 1,715 | 2,605 | 0,974 |
| Random Forest: prueba | 4,364 | 5,667 | 0,877 |
| Media: prueba | 12,921 | 16,158 | -0,0003 |

El MAE disminuye aproximadamente un 66,2 % frente a la referencia en prueba. El modelo comete más errores fuera del entrenamiento: existe una brecha de generalización y no afirmamos ausencia total de sobreajuste. La prueba es coherente con el error de validación y mejora la referencia. R² no equivale a un porcentaje de aciertos.

## Hallazgos exploratorios y límites

- La edad más frecuente en entrenamiento es 28 días; la cobertura de edades no es uniforme.
- La mediana de resistencia en entrenamiento es 33,78 MPa.
- El cemento presenta la mayor correlación lineal absoluta individual con la resistencia entre las entradas.
- La razón agua/cemento tiene correlación de aproximadamente -0,466 con la resistencia. Es asociación, no una demostración causal. Se exploró, pero no se añadió al modelo.
- Los gráficos muestran dispersión y relaciones que una sola variable no explica; se compararon árboles para capturar interacciones.
- Los errores de prueba incluyen subestimaciones en muestras de alta resistencia.
- No hay identificador de lote. La separación por receta exacta no detecta todas las recetas casi iguales ni demuestra independencia experimental completa.
- Los datos son históricos y de un origen concreto. Se necesita validación con ensayos locales antes de un uso operativo.

## Aplicación y reproducción

La interfaz tiene ocho campos, recetas de ejemplo y un botón de predicción. Muestra unidades, rangos y métricas reales. Rechaza entradas vacías, no numéricas o fuera de los rangos del entrenamiento, y descarta resultados obsoletos al cambiar un campo.

La aplicación estática usa `docs/modelo.json`, exportado de los mismos árboles de scikit-learn evaluados. `docs/predict.js` convierte entradas a float32, recorre cada árbol y promedia sus hojas. Se comprobó coincidencia con Python en las 1.005 filas: diferencia máxima 0. No se reentrenó el modelo con el conjunto de prueba después de medirlo.

### Google Colab

1. Abre el enlace del notebook.
2. Ejecuta las celdas en orden. No se necesita GPU.
3. Si no puede obtener el Excel del repositorio, sube `data/Concrete_Data.xls` cuando lo solicite.
4. Los archivos generados quedan en `results/`, `models/` y `docs/modelo.json` en la sesión de Colab. Descárgalos si quieres conservar una nueva ejecución.

### Ejecución local

Python 3.12. Instala `pip install -r requirements.txt`, abre Jupyter y ejecuta el notebook desde la raíz. Para servir la interfaz existente:

```bash
python -m http.server 8000 --directory docs
```

Abre http://localhost:8000. No abras `index.html` directamente como archivo, porque el navegador puede bloquear la lectura del JSON. El modelo `joblib` debe cargarse con la versión de scikit-learn indicada en `results/resumen.json`; no cargues archivos joblib de origen desconocido.

Para alojar por tu cuenta, publica la carpeta `docs` en un servicio de páginas estáticas. En GitHub Pages, selecciona la rama `main` y `/docs` como carpeta si deseas un segundo enlace. No se necesita una API ni una base de datos.

### Estructura

```text
model_development.ipynb   Desarrollo completo y resultados
data/                    Excel y descripción original
models/modelo.joblib     Modelo Python evaluado
docs/                    Aplicación estática y modelo JSON
results/                 Métricas, búsquedas, particiones y gráficas
```

## Reajuste propuesto

Revisar mensualmente datos nuevos y errores cuando existan al menos 50 ensayos reales. Investigar más del 10 % de entradas fuera de rango o MAE superior a 1,25 veces el de referencia durante dos revisiones. El umbral inicial equivale a aproximadamente 5,46 MPa y es una propuesta operativa, no una norma de ingeniería.

Revisar trimestralmente la necesidad de reentrenar. Mantener separación por receta y reservar datos recientes. Comparar nueva y vieja versión sobre los mismos datos, por MAE/RMSE y segmentos de edad. Registrar y conservar la versión anterior para revertir. La interfaz actual no recopila datos ni implementa monitoreo: este apartado es la estrategia solicitada.

## Correspondencia con los requisitos

| Requisito | Evidencia |
|---|---|
| 3.1 Problema y usuarios | Introducción del notebook y README |
| 3.2 Preprocesamiento | Sección 2 del notebook |
| 3.3 EDA e insights | Sección 4 y gráficas |
| 3.4 Paradigma | Regresión supervisada |
| 3.5 Selección e hiperparámetros | Sección 5 y resultados CV |
| 3.6 Generalización | Grupos separados, CV y prueba reservada |
| 3.7 Métricas | Sección 6, MAE/RMSE/R² con interpretación |
| 3.8 Despliegue e interfaz | Aplicación web y carpeta docs |
| 3.9 Reajuste | Sección 9 y plan de este README |

El video de demostración de dos minutos se entrega junto con el enlace al repositorio y el notebook. Su grabación está pendiente.
