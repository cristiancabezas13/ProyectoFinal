let trainedModel;
const labels = ['Cemento','Escoria de alto horno','Ceniza volante','Agua','Superplastificante','Agregado grueso','Agregado fino','Edad (días)'];
const format = n => Number(n).toLocaleString('es-CO',{maximumFractionDigits:2});
async function start() {
  try {
    const response = await fetch('modelo.json');
    if (!response.ok) throw new Error('No se pudo descargar el modelo.');
    trainedModel = await response.json();
    const fields = document.getElementById('fields');
    trainedModel.features.forEach((name,i) => {
      const limit = trainedModel.limits[name];
      const div = document.createElement('div'); div.className = 'field';
      div.innerHTML = `<label for="${name}">${labels[i]}</label><input id="${name}" name="${name}" type="number" step="${i===7?'1':'any'}" min="${limit.min}" max="${limit.max}" required aria-describedby="range-${name}"><small id="range-${name}">Rango observado: ${format(limit.min)}–${format(limit.max)} ${i===7?'días':'kg/m³'}</small>`;
      fields.appendChild(div);
    });
    const select = document.getElementById('example');
    trainedModel.examples.forEach((e,i) => select.add(new Option(e.nombre,String(i))));
    select.addEventListener('change',() => {
      if (select.value==='') return;
      trainedModel.examples[Number(select.value)].valores.forEach((v,i) => document.getElementById(trainedModel.features[i]).value = v);
      clearResult('Receta cargada. Pulsa «Estimar resistencia».');
    });
    document.getElementById('prediction-form').addEventListener('input',() => {
      select.value=''; clearResult('Cambiaste la mezcla. Pulsa «Estimar resistencia» para actualizar.');
    });
    const m = trainedModel.metrics;
    document.getElementById('mae').textContent = format(m.test.MAE);
    document.getElementById('r2').textContent = format(m.test.R2);
    document.getElementById('evaluation-note').textContent = `${m.modelo} · ${m.test_filas} ensayos de ${m.test_grupos} recetas reservadas para prueba.`;
    document.getElementById('model-note').textContent = `Modelo: ${m.modelo}. ${trainedModel.trees.length} árbol(es). Selección con cinco particiones por receta. La predicción se calcula en este navegador; los datos introducidos no se guardan.`;
    document.getElementById('submit').disabled = false;
    document.getElementById('load-status').textContent='';
    select.value='0'; select.dispatchEvent(new Event('change'));
  } catch (error) {
    document.getElementById('load-status').textContent = 'No se pudo cargar el modelo. Revisa tu conexión y recarga la página.';
  }
}
function clearResult(note) {
  document.getElementById('result').innerHTML='— <span>MPa</span>';
  document.getElementById('result-note').textContent=note;
  document.getElementById('validation').textContent='';
}
document.getElementById('prediction-form').addEventListener('submit',event => {
  event.preventDefault();
  try {
    const values = trainedModel.features.map(name=>{
      const input=document.getElementById(name); const v=input.valueAsNumber;
      const limits=trainedModel.limits[name];
      if (!input.checkValidity() || !Number.isFinite(v) || v<limits.min || v>limits.max) throw new Error('Revisa los campos y respeta los rangos indicados.');
      return v;
    });
    const result = predict(trainedModel,values);
    document.getElementById('result').innerHTML=`${format(result)} <span>MPa</span>`;
    document.getElementById('result-note').textContent=`Estimación para una edad de ${format(values[7])} días.`;
    document.getElementById('validation').textContent='';
  } catch (error) {clearResult('No se pudo realizar la estimación.');document.getElementById('validation').textContent=error.message;}
});
start();
