// Configuración de tema para Tailwind CSS
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    900: '#78350f',
                }
            }
        }
    }
};

const CSV_REMOTO_URL = 'https://raw.githubusercontent.com/sebastiangiuliante/cotizadorfv/main/paneles_inversores.csv';

// Estado del Asistente y Proyecto
const state = {
    tipoProyecto: null,
    sistema: null,
    tension: null,
    almacenamiento: null,
    potenciaKw: 5,
    markupGlobal: 45,
    catalogo: [],
    cotizacionItems: []
};

window.onload = function() {
    cargarBaseInicial();
};

// --- SISTEMA DE NAVEGACIÓN Y VISTAS ---
function setVista(vista) {
    const vWizard = document.getElementById('view-wizard');
    const vCat = document.getElementById('view-catalogo');
    const btnW = document.getElementById('btn-vista-wizard');
    const btnC = document.getElementById('btn-vista-catalogo');

    if (vista === 'wizard') {
        vWizard.classList.remove('hidden');
        vCat.classList.add('hidden');
        btnW.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-brand-500 text-slate-950 shadow-md flex items-center gap-2";
        btnC.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2";
    } else {
        vCat.classList.remove('hidden');
        vWizard.classList.add('hidden');
        btnC.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-brand-500 text-slate-950 shadow-md flex items-center gap-2";
        btnW.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2";
        renderizarTablaBaseDatos();
    }
}

function irAPaso(paso) {
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`step-section-${i}`);
        if (el) el.classList.add('hidden');

        const navPill = document.getElementById(`step-nav-${i}`);
        if (navPill) {
            if (i === paso) {
                navPill.className = "step-pill py-2 rounded-xl bg-brand-500 text-slate-950 font-bold transition flex items-center justify-center gap-1.5 shadow-sm";
            } else if (i < paso) {
                navPill.className = "step-pill py-2 rounded-xl bg-amber-100 text-amber-900 font-semibold transition flex items-center justify-center gap-1.5";
            } else {
                navPill.className = "step-pill py-2 rounded-xl bg-slate-100 text-slate-500 font-semibold transition flex items-center justify-center gap-1.5";
            }
        }
    }

    const actual = document.getElementById(`step-section-${paso}`);
    if (actual) actual.classList.remove('hidden');

    if (paso === 4) {
        configurarLimitesSlider();
    } else if (paso === 5) {
        actualizarResumenCabeceraPaso5();
        renderizarCotizacion();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- PASO 1: TIPO DE PROYECTO ---
function selectTipoProyecto(tipo) {
    state.tipoProyecto = tipo;
    ['residencial', 'utility', 'carport'].forEach(t => {
        const card = document.getElementById(`card-tipo-${t}`);
        if (t === tipo) {
            card.classList.add('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.remove('border-slate-200');
        } else {
            card.classList.remove('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.add('border-slate-200');
        }
    });

    const btn = document.getElementById('btn-next-1');
    btn.disabled = false;
    btn.className = "px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm transition flex items-center gap-2 shadow cursor-pointer";
}

// --- PASO 2: MODALIDAD DE SISTEMA ---
function selectSistema(sistema) {
    state.sistema = sistema;
    ['ongrid', 'offgrid', 'hibrido'].forEach(s => {
        const card = document.getElementById(`card-sis-${s}`);
        if (s === sistema) {
            card.classList.add('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.remove('border-slate-200');
        } else {
            card.classList.remove('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.add('border-slate-200');
        }
    });

    if (sistema === 'offgrid') {
        selectBaterias('con_baterias');
    } else if (sistema === 'ongrid' && !state.almacenamiento) {
        selectBaterias('sin_baterias');
    }

    const btn = document.getElementById('btn-next-2');
    btn.disabled = false;
    btn.className = "px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm transition flex items-center gap-2 shadow cursor-pointer";
}

// --- PASO 3: TENSIÓN & BATERÍAS ---
function selectTension(val) {
    state.tension = val;
    const el220 = document.getElementById('opt-tension-220');
    const el380 = document.getElementById('opt-tension-380');

    if (val === '220v') {
        el220.classList.add('border-brand-500', 'bg-amber-50/50', 'text-slate-900');
        el220.querySelector('.check-icon').classList.replace('text-slate-300', 'text-brand-500');
        el380.classList.remove('border-brand-500', 'bg-amber-50/50');
        el380.querySelector('.check-icon').classList.replace('text-brand-500', 'text-slate-300');
    } else {
        el380.classList.add('border-brand-500', 'bg-amber-50/50', 'text-slate-900');
        el380.querySelector('.check-icon').classList.replace('text-slate-300', 'text-brand-500');
        el220.classList.remove('border-brand-500', 'bg-amber-50/50');
        el220.querySelector('.check-icon').classList.replace('text-brand-500', 'text-slate-300');
    }
    evaluarPaso3Listo();
}

function selectBaterias(val) {
    state.almacenamiento = val;
    const elSin = document.getElementById('opt-bat-sin');
    const elCon = document.getElementById('opt-bat-con');

    if (val === 'sin_baterias') {
        elSin.classList.add('border-brand-500', 'bg-amber-50/50');
        elSin.querySelector('.check-icon').classList.replace('text-slate-300', 'text-brand-500');
        elCon.classList.remove('border-brand-500', 'bg-amber-50/50');
        elCon.querySelector('.check-icon').classList.replace('text-brand-500', 'text-slate-300');
    } else {
        elCon.classList.add('border-brand-500', 'bg-amber-50/50');
        elCon.querySelector('.check-icon').classList.replace('text-slate-300', 'text-brand-500');
        elSin.classList.remove('border-brand-500', 'bg-amber-50/50');
        elSin.querySelector('.check-icon').classList.replace('text-brand-500', 'text-slate-300');
    }
    evaluarPaso3Listo();
}

function evaluarPaso3Listo() {
    if (state.tension && state.almacenamiento) {
        const btn = document.getElementById('btn-next-3');
        btn.disabled = false;
        btn.className = "px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm transition flex items-center gap-2 shadow cursor-pointer";
    }
}

// --- PASO 4: SLIDER DE POTENCIA INTELIGENTE ---
function configurarLimitesSlider() {
    const slider = document.getElementById('slider-potencia');
    const badge = document.getElementById('badge-tipo-potencia');
    const lblMin = document.getElementById('lbl-slider-min');
    const lblMid = document.getElementById('lbl-slider-mid');
    const lblMax = document.getElementById('lbl-slider-max');
    const lblRatio = document.getElementById('lbl-ratio-referencia');

    if (state.tipoProyecto === 'residencial') {
        slider.min = "1";
        slider.max = "99";
        slider.step = "1";
        slider.value = state.potenciaKw && state.potenciaKw <= 99 ? state.potenciaKw : "5";
        badge.textContent = "Residencial (Máx 99 kW)";
        lblMin.textContent = "1 kW";
        lblMid.textContent = "50 kW";
        lblMax.textContent = "99 kW";
        lblRatio.textContent = "1.15 - 1.60 USD/W";
    } else if (state.tipoProyecto === 'utility') {
        slider.min = "100";
        slider.max = "500";
        slider.step = "10";
        slider.value = state.potenciaKw && state.potenciaKw >= 100 ? state.potenciaKw : "150";
        badge.textContent = "Utility / Gran Parque (100 kW - 500 kW+)";
        lblMin.textContent = "100 kW";
        lblMid.textContent = "300 kW";
        lblMax.textContent = "500 kW";
        lblRatio.textContent = "0.70 - 0.90 USD/W";
    } else if (state.tipoProyecto === 'carport') {
        slider.min = "5";
        slider.max = "150";
        slider.step = "5";
        slider.value = state.potenciaKw && state.potenciaKw >= 5 && state.potenciaKw <= 150 ? state.potenciaKw : "20";
        badge.textContent = "Carport Solar (5 kW - 150 kW)";
        lblMin.textContent = "5 kW";
        lblMid.textContent = "75 kW";
        lblMax.textContent = "150 kW";
        lblRatio.textContent = "1.10 - 1.40 USD/W";
    }

    actualizarSliderPotencia(slider.value);
}

function actualizarSliderPotencia(val) {
    state.potenciaKw = parseFloat(val);
    document.getElementById('lbl-potencia-valor').textContent = val;

    const cantPaneles = Math.round((state.potenciaKw * 1000) / 550);
    document.getElementById('lbl-estimacion-paneles').textContent = `Equivale aproximadamente a ~${cantPaneles} paneles de 550Wp`;

    const genMes = Math.round(state.potenciaKw * 4.3 * 30);
    document.getElementById('lbl-gen-est').textContent = `~${genMes.toLocaleString()} kWh/mes`;

    const areaM2 = Math.round(cantPaneles * 2.6);
    document.getElementById('lbl-area-est').textContent = `~${areaM2} m²`;

    renderizarCotizacion();
}

// --- PASO 5: PRESUPUESTO & SELECCIÓN DE EQUIPOS ---
function actualizarResumenCabeceraPaso5() {
    const titulos = {
        residencial: "Proyecto Residencial",
        utility: "Parque Solar / Utility",
        carport: "Carport Fotovoltaico"
    };
    const nombresSistema = {
        ongrid: "On-Grid (Red)",
        offgrid: "Off-Grid (Aislado)",
        hibrido: "Híbrido con Respaldo"
    };

    document.getElementById('summary-titulo').textContent = `${titulos[state.tipoProyecto] || 'Proyecto'} - ${nombresSistema[state.sistema] || ''}`;
    document.getElementById('summary-potencia').textContent = `${state.potenciaKw} kWp`;
    document.getElementById('lbl-potencia-ref-totales').textContent = `${state.potenciaKw} kWp`;

    const txtBat = state.almacenamiento === 'con_baterias' ? 'Con Baterías' : 'Sin Baterías';
    const txtTens = state.tension === '220v' ? 'Monofásico 220V' : 'Trifásico 380V';
    document.getElementById('summary-detalles').textContent = `Tensión: ${txtTens} • Almacenamiento: ${txtBat} • Markup Base: ${state.markupGlobal}%`;
}

function cargarCategoriasPresupuesto() {
    const selectCat = document.getElementById('sel-cat-presupuesto');
    if (!selectCat) return;
    selectCat.innerHTML = '<option value="">Seleccione categoría...</option>';
    const categorias = [...new Set(state.catalogo.map(p => p.categoria))].filter(Boolean).sort();
    categorias.forEach(cat => {
        selectCat.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function onCambioCategoria() {
    const cat = document.getElementById('sel-cat-presupuesto').value;
    const selectMarca = document.getElementById('sel-marca-presupuesto');
    const selectProd = document.getElementById('sel-prod-presupuesto');
    const preview = document.getElementById('box-item-preview');

    selectMarca.innerHTML = '<option value="">Seleccione marca...</option>';
    selectProd.innerHTML = '<option value="">Primero elija marca...</option>';
    selectProd.disabled = true;
    preview.classList.add('hidden');

    if (!cat) {
        selectMarca.disabled = true;
        return;
    }

    const marcas = [...new Set(state.catalogo.filter(p => p.categoria === cat).map(p => p.fabricante))].filter(Boolean).sort();
    marcas.forEach(m => {
        selectMarca.innerHTML += `<option value="${m}">${m}</option>`;
    });
    selectMarca.disabled = false;
}

function onCambioMarca() {
    const cat = document.getElementById('sel-cat-presupuesto').value;
    const marca = document.getElementById('sel-marca-presupuesto').value;
    const selectProd = document.getElementById('sel-prod-presupuesto');
    const preview = document.getElementById('box-item-preview');

    selectProd.innerHTML = '<option value="">Seleccione producto...</option>';
    preview.classList.add('hidden');

    if (!marca) {
        selectProd.disabled = true;
        return;
    }

    const prods = state.catalogo.filter(p => p.categoria === cat && p.fabricante === marca);
    prods.forEach(p => {
        const infoExtra = p.potencia_w > 0 ? ` [${p.potencia_w}W]` : '';
        selectProd.innerHTML += `<option value="${p.codigo}">${p.descripcion}${infoExtra}</option>`;
    });
    selectProd.disabled = false;
}

function onCambioProducto() {
    const cod = document.getElementById('sel-prod-presupuesto').value;
    const prod = state.catalogo.find(p => p.codigo === cod);
    const preview = document.getElementById('box-item-preview');

    if (!prod) {
        preview.classList.add('hidden');
        return;
    }

    const precioVenta = calcularPrecioConMarkup(prod.costo_base);

    document.getElementById('prev-desc').textContent = prod.descripcion;
    document.getElementById('prev-costo').textContent = `$${prod.costo_base.toFixed(2)} USD`;
    document.getElementById('prev-precio-venta').textContent = `$${precioVenta.toFixed(2)} USD`;
    document.getElementById('prev-iva').textContent = `${prod.iva || 21}%`;
    document.getElementById('prev-disp').textContent = prod.disp || 'Disponible';
    preview.classList.remove('hidden');

    // Sugerir cantidad si es panel solar
    if (prod.potencia_w > 0 && prod.categoria.includes("PANEL")) {
        const sugeridos = Math.round((state.potenciaKw * 1000) / prod.potencia_w);
        document.getElementById('input-item-cantidad').value = sugeridos > 0 ? sugeridos : 1;
    }
}

function calcularPrecioConMarkup(costoBase) {
    const margen = parseFloat(state.markupGlobal) || 0;
    return costoBase * (1 + (margen / 100));
}

function actualizarMarkupGlobal(val) {
    state.markupGlobal = parseFloat(val) || 0;
    document.getElementById('stat-markup-val').textContent = `${state.markupGlobal}%`;
    onCambioProducto();
    state.cotizacionItems.forEach(item => {
        item.precioVenta = item.costoBase * (1 + (state.markupGlobal / 100));
    });
    renderizarCotizacion();
    mostrarToast(`Markup general actualizado a ${state.markupGlobal}%`);
}

function agregarItemActual() {
    const cod = document.getElementById('sel-prod-presupuesto').value;
    const cant = parseInt(document.getElementById('input-item-cantidad').value) || 1;
    const prod = state.catalogo.find(p => p.codigo === cod);

    if (!prod) {
        mostrarToast("Por favor seleccioná un producto válido.", "error");
        return;
    }

    const existente = state.cotizacionItems.find(i => i.codigo === prod.codigo);
    if (existente) {
        existente.cantidad += cant;
    } else {
        state.cotizacionItems.push({
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            categoria: prod.categoria,
            costoBase: prod.costo_base,
            precioVenta: calcularPrecioConMarkup(prod.costo_base),
            iva: prod.iva || 21,
            cantidad: cant
        });
    }

    renderizarCotizacion();
    mostrarToast(`Agregado: ${prod.descripcion.substring(0, 30)}...`);
    document.getElementById('input-item-cantidad').value = 1;
}

// --- AUTO-ARMADO DE KIT SUGERIDO ---
function autoCompletarKits() {
    if (state.catalogo.length === 0) {
        mostrarToast("Catálogo vacío. Conectá a GitHub primero.", "error");
        return;
    }
    state.cotizacionItems = [];

    // 1. Paneles
    const panel = state.catalogo.find(p => p.categoria.includes("PANEL")) || state.catalogo[0];
    const pot = panel.potencia_w > 0 ? panel.potencia_w : 550;
    const cantPaneles = Math.max(1, Math.round((state.potenciaKw * 1000) / pot));
    state.cotizacionItems.push({
        codigo: panel.codigo,
        descripcion: panel.descripcion,
        categoria: panel.categoria,
        costoBase: panel.costo_base,
        precioVenta: calcularPrecioConMarkup(panel.costo_base),
        iva: panel.iva || 10.5,
        cantidad: cantPaneles
    });

    // 2. Inversores
    let inversor = null;
    if (state.sistema === 'hibrido') {
        inversor = state.catalogo.find(p => p.categoria.includes("HÍBRIDO") || p.categoria.includes("HIBRIDO"));
    } else if (state.sistema === 'offgrid') {
        inversor = state.catalogo.find(p => p.categoria.includes("OFF-GRID") || p.categoria.includes("AISLADO"));
    } else {
        inversor = state.catalogo.find(p => p.categoria.includes("INVERSOR") || p.categoria.includes("ON-GRID"));
    }

    if (inversor) {
        state.cotizacionItems.push({
            codigo: inversor.codigo,
            descripcion: inversor.descripcion,
            categoria: inversor.categoria,
            costoBase: inversor.costo_base,
            precioVenta: calcularPrecioConMarkup(inversor.costo_base),
            iva: inversor.iva || 21,
            cantidad: 1
        });
    }

    renderizarCotizacion();
    mostrarToast("Kit básico sugerido auto-armado.", "success");
}

// --- TABLA DE COTIZACIÓN Y RATIO WATT/DOLAR ---
function renderizarCotizacion() {
    const tbody = document.getElementById('tabla-cotizacion-body');

    if (state.cotizacionItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-10 text-slate-400 italic">
                    No hay ítems cargados en la cotización.<br>
                    Hacé clic en <b>"Auto-armar Kit Sugerido"</b> o agregá productos individualmente.
                </td>
            </tr>
        `;
        actualizarTotalesVista(0, 0);
        return;
    }

    tbody.innerHTML = '';
    let subtotalGral = 0;
    let totalIvaGral = 0;

    state.cotizacionItems.forEach((item, index) => {
        const subItem = item.precioVenta * item.cantidad;
        const ivaItem = subItem * ((item.iva || 21) / 100);
        subtotalGral += subItem;
        totalIvaGral += ivaItem;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
                <td class="py-2.5 px-3 font-bold text-slate-800">
                    <input type="number" min="1" value="${item.cantidad}" onchange="modificarCantidadItem(${index}, this.value)" class="w-12 border border-slate-200 rounded px-1 text-center font-bold">
                </td>
                <td class="py-2.5 px-3">
                    <span class="font-bold text-slate-900 block">${item.descripcion}</span>
                    <span class="text-[10px] text-slate-400 font-mono">SKU: ${item.codigo} &bull; Cat: ${item.categoria}</span>
                </td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-700">$${item.precioVenta.toFixed(2)}</td>
                <td class="py-2.5 px-3 text-right font-mono font-black text-slate-900">$${subItem.toFixed(2)}</td>
                <td class="py-2.5 px-3 text-center">
                    <button onclick="eliminarItem(${index})" class="text-rose-500 hover:text-rose-700 p-1" title="Eliminar ítem">
                        <i class="fa-solid fa-xmark text-sm font-bold"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    actualizarTotalesVista(subtotalGral, totalIvaGral);
}

function modificarCantidadItem(index, valor) {
    const cant = parseInt(valor);
    if (cant > 0) {
        state.cotizacionItems[index].cantidad = cant;
        renderizarCotizacion();
    }
}

function eliminarItem(index) {
    state.cotizacionItems.splice(index, 1);
    renderizarCotizacion();
}

function vaciarCotizacion() {
    if (state.cotizacionItems.length === 0) return;
    state.cotizacionItems = [];
    renderizarCotizacion();
    mostrarToast("Cotización vaciada.");
}

function actualizarTotalesVista(subtotal, iva) {
    const final = subtotal + iva;
    document.getElementById('tot-subtotal').textContent = `$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
    document.getElementById('tot-iva').textContent = `$${iva.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
    document.getElementById('tot-final').textContent = `$${final.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;

    const potenciaWatts = (state.potenciaKw || 1) * 1000;
    const ratioUsdWatt = (final / potenciaWatts).toFixed(2);
    document.getElementById('lbl-ratio-calculado').textContent = `${ratioUsdWatt} USD/W`;
}

// --- GESTIÓN DE BASE DE DATOS & SINCRONIZACIÓN CSV REMOTA ---
function parseCSVLine(text, separator) {
    let result = [], cur = '', inQuote = false;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (inQuote) {
            if (char === '"') {
                if (text[i+1] === '"') { cur += '"'; i++; } else inQuote = false;
            } else cur += char;
        } else {
            if (char === '"') inQuote = true;
            else if (char === separator) { result.push(cur.trim()); cur = ''; }
            else cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

function procesarTextoCSV(texto) {
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.substring(1);
    const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lineas.length < 2) return [];

    const sep = lineas[0].includes(';') ? ';' : ',';
    const headers = parseCSVLine(lineas[0], sep).map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/['"]/g, ''));

    const idxTipo = headers.findIndex(h => h.includes('tipo') || h.includes('cat'));
    const idxMarca = headers.findIndex(h => h.includes('marca') || h.includes('modelo') || h.includes('desc') || h.includes('sku'));
    const idxPot = headers.findIndex(h => h.includes('potencia') || h.includes('wp') || h.includes('watt'));
    const idxPrecio = headers.findIndex(h => h.includes('precio') || h.includes('costo') || h.includes('usd'));

    const nuevoCatalogo = [];
    for (let i = 1; i < lineas.length; i++) {
        const col = parseCSVLine(lineas[i], sep);
        if (col.length >= 2) {
            const tipo = idxTipo !== -1 && col[idxTipo] ? col[idxTipo] : 'GENERAL';
            const marcaModelo = idxMarca !== -1 && col[idxMarca] ? col[idxMarca] : `ITEM-${i}`;
            const pot = idxPot !== -1 ? parseFloat(col[idxPot]) || 0 : 0;
            const precio = idxPrecio !== -1 ? parseFloat(col[idxPrecio].replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0 : 0;

            // Descomponer fabricante de la primera palabra
            const partes = marcaModelo.split(' ');
            const fabricante = partes[0] || 'Genérico';

            nuevoCatalogo.push({
                codigo: marcaModelo,
                categoria: tipo.toUpperCase(),
                fabricante: fabricante,
                descripcion: marcaModelo,
                costo_base: precio,
                iva: tipo.toUpperCase().includes("PANEL") ? 10.5 : 21,
                disp: 'En Stock',
                potencia_w: pot
            });
        }
    }
    return nuevoCatalogo;
}

async function sincronizarDesdeGitHub(manual = false) {
    try {
        if (manual) mostrarToast("Descargando archivo desde GitHub...", "info");
        // Cache-busting para asegurar obtener el commit más reciente
        const res = await fetch(`${CSV_REMOTO_URL}?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error("No se pudo descargar el archivo CSV");
        
        const texto = await res.text();
        const productos = procesarTextoCSV(texto);

        if (productos.length > 0) {
            state.catalogo = productos;
            localStorage.setItem('solar_catalogo_remoto_cache', JSON.stringify(productos));
            actualizarEstadisticasDB();
            cargarCategoriasPresupuesto();
            renderizarTablaBaseDatos();
            mostrarToast(`Sincronizados ${productos.length} productos desde GitHub`, "success");
        }
    } catch (err) {
        console.error("Error al sincronizar con GitHub:", err);
        if (manual) mostrarToast("Error al conectar con GitHub. Usando datos locales.", "error");
    }
}

function cargarBaseInicial() {
    const cache = localStorage.getItem('solar_catalogo_remoto_cache');
    if (cache) {
        try {
            state.catalogo = JSON.parse(cache);
            actualizarEstadisticasDB();
            cargarCategoriasPresupuesto();
        } catch(e) {}
    }
    // Sincronizar en segundo plano
    sincronizarDesdeGitHub(false);
}

function actualizarEstadisticasDB() {
    document.getElementById('stat-total-prod').textContent = state.catalogo.length;
    const cats = new Set(state.catalogo.map(p => p.categoria)).size;
    document.getElementById('stat-total-cat').textContent = cats;
    const marcas = new Set(state.catalogo.map(p => p.fabricante)).size;
    document.getElementById('stat-total-marcas').textContent = marcas;
    document.getElementById('stat-markup-val').textContent = `${state.markupGlobal}%`;
}

function renderizarTablaBaseDatos() {
    const tbody = document.getElementById('tabla-db-body');
    if (state.catalogo.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No hay productos cargados. Hacé clic en "Actualizar desde GitHub".</td></tr>`;
        return;
    }
    tbody.innerHTML = state.catalogo.slice(0, 300).map(p => `
        <tr class="hover:bg-amber-50/50 transition">
            <td class="p-3 border-b font-mono font-semibold text-slate-800">${p.codigo}</td>
            <td class="p-3 border-b"><span class="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-slate-600">${p.categoria}</span></td>
            <td class="p-3 border-b font-semibold text-slate-700">${p.fabricante}</td>
            <td class="p-3 border-b text-center font-bold text-slate-600">${p.potencia_w > 0 ? `${p.potencia_w} W` : '-'}</td>
            <td class="p-3 border-b text-right font-black text-emerald-600">$${p.costo_base.toFixed(2)}</td>
        </tr>
    `).join('');
}

function importarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const productos = procesarTextoCSV(e.target.result);
        if (productos.length > 0) {
            state.catalogo = productos;
            localStorage.setItem('solar_catalogo_remoto_cache', JSON.stringify(productos));
            actualizarEstadisticasDB();
            cargarCategoriasPresupuesto();
            renderizarTablaBaseDatos();
            mostrarToast(`¡Se cargaron ${productos.length} productos localmente!`, "success");
        } else {
            mostrarToast("No se detectaron filas válidas en el CSV.", "error");
        }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

function exportarCSV() {
    if (state.catalogo.length === 0) {
        mostrarToast("No hay datos para exportar.", "error");
        return;
    }
    let csv = '\uFEFFtipo,marca_modelo,potencia_w,precio_usd\n';
    state.catalogo.forEach(p => {
        csv += `"${p.categoria}","${p.descripcion}",${p.potencia_w},${p.costo_base}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "paneles_inversores.csv";
    link.click();
    mostrarToast("Catálogo descargado como CSV", "success");
}

// Sistema de notificaciones Toast
function mostrarToast(msg, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bg = 'bg-slate-900 text-white border-slate-700';
    if (tipo === 'success') bg = 'bg-emerald-950 text-emerald-100 border-emerald-700';
    if (tipo === 'error') bg = 'bg-rose-950 text-rose-100 border-rose-700';

    toast.className = `${bg} px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border pointer-events-auto transition-all duration-300`;
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-brand-400 text-sm"></i><span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}