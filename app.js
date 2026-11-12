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
    clienteId: 'GSE-001',
    clienteNombre: '',
    clienteUbicacion: '',
    tipoProyecto: null,
    sistema: null,
    tension: null,
    almacenamiento: null,
    potenciaKw: 5,
    markupGlobal: 50,
    consumoMensualKwh: null,
    potenciaSugeridaFactura: null,
    catalogo: [],
    cotizacionItems: []
};

window.onload = function() {
    cargarBaseInicial();
    inicializarIdCliente();
    actualizarContadorGuardados();
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
        btnW.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-brand-500 text-slate-950 shadow-md flex items-center gap-2 hover:bg-brand-400";
        btnC.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2";
    } else {
        vCat.classList.remove('hidden');
        vWizard.classList.add('hidden');
        btnC.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-brand-500 text-slate-950 shadow-md flex items-center gap-2 hover:bg-brand-400";
        btnW.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2";
        renderizarTablaBaseDatos();
    }
}

function clickBotonAsistenteGuiado() {
    const vWizard = document.getElementById('view-wizard');
    const estaEnCatalogo = vWizard.classList.contains('hidden');

    if (estaEnCatalogo) {
        setVista('wizard');
        return;
    }

    const pasoVisible = obtenerPasoActualVisible();
    if (pasoVisible > 1 || state.cotizacionItems.length > 0) {
        confirmarReinicioWizard('asistente');
    } else {
        irAPaso(1);
    }
}

function obtenerPasoActualVisible() {
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`step-section-${i}`);
        if (el && !el.classList.contains('hidden')) return i;
    }
    return 1;
}

function confirmarReinicioWizard(origen = 'reconfigurar') {
    const mensaje = "¿Deseas volver a empezar el asistente desde el inicio? Ten en cuenta que deberás volver a configurar los parámetros del proyecto.";
    if (confirm(mensaje)) {
        reiniciarWizard();
    }
}

function reiniciarWizard() {
    state.tipoProyecto = null;
    state.sistema = null;
    state.tension = null;
    state.almacenamiento = null;
    state.consumoMensualKwh = null;
    state.potenciaSugeridaFactura = null;

    // Resetear tarjetas visuales paso 1
    ['residencial', 'industrial', 'utility', 'carport'].forEach(t => {
        const c = document.getElementById(`card-tipo-${t}`);
        if (c) {
            c.classList.remove('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            c.classList.add('border-slate-200');
        }
    });

    // Resetear tarjetas paso 2
    ['ongrid', 'offgrid', 'hibrido'].forEach(s => {
        const c = document.getElementById(`card-sis-${s}`);
        if (c) {
            c.classList.remove('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            c.classList.add('border-slate-200');
        }
    });

    // Resetear tensión
    const el220 = document.getElementById('opt-tension-220');
    const el380 = document.getElementById('opt-tension-380');
    if (el220) {
        el220.classList.remove('border-brand-500', 'bg-amber-50/50');
        el220.querySelector('.check-icon')?.classList.replace('text-brand-500', 'text-slate-300');
    }
    if (el380) {
        el380.classList.remove('border-brand-500', 'bg-amber-50/50');
        el380.querySelector('.check-icon')?.classList.replace('text-brand-500', 'text-slate-300');
    }

    // Resetear almacenamiento
    const elSin = document.getElementById('opt-bat-sin');
    const elCon = document.getElementById('opt-bat-con');
    if (elSin) {
        elSin.classList.remove('border-brand-500', 'bg-amber-50/50', 'pointer-events-none', 'opacity-40', 'bg-slate-100');
        elSin.querySelector('.check-icon')?.classList.replace('text-brand-500', 'text-slate-300');
    }
    if (elCon) {
        elCon.classList.remove('border-brand-500', 'bg-amber-50/50', 'pointer-events-none', 'opacity-40', 'bg-slate-100');
        elCon.querySelector('.check-icon')?.classList.replace('text-brand-500', 'text-slate-300');
    }

    const badgeEstado = document.getElementById('badge-almacenamiento-estado');
    if (badgeEstado) badgeEstado.innerHTML = '';
    const avisoBat = document.getElementById('aviso-almacenamiento');
    if (avisoBat) avisoBat.classList.add('hidden');

    // Resetear consumo de factura
    const inpConsumo = document.getElementById('input-consumo-kwh');
    if (inpConsumo) inpConsumo.value = '';
    const boxSug = document.getElementById('box-sugerencia-potencia');
    if (boxSug) boxSug.classList.add('hidden');

    // Deshabilitar botones continuar
    const btn1 = document.getElementById('btn-next-1');
    if (btn1) {
        btn1.disabled = true;
        btn1.className = "px-8 py-3 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm cursor-not-allowed transition flex items-center gap-2";
    }
    const btn2 = document.getElementById('btn-next-2');
    if (btn2) {
        btn2.disabled = true;
        btn2.className = "px-8 py-3 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm cursor-not-allowed transition flex items-center gap-2";
    }
    const btn3 = document.getElementById('btn-next-3');
    if (btn3) {
        btn3.disabled = true;
        btn3.className = "px-8 py-3 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm cursor-not-allowed transition flex items-center gap-2";
    }

    irAPaso(1);
    mostrarToast("Asistente reiniciado.");
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

    if (paso === 3) {
        actualizarDisponibilidadBaterias();
    } else if (paso === 4) {
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
    ['residencial', 'industrial', 'utility', 'carport'].forEach(t => {
        const card = document.getElementById(`card-tipo-${t}`);
        if (!card) return;
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
        if (!card) return;
        if (s === sistema) {
            card.classList.add('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.remove('border-slate-200');
        } else {
            card.classList.remove('border-brand-500', 'bg-amber-50/40', 'ring-2', 'ring-brand-500');
            card.classList.add('border-slate-200');
        }
    });

    actualizarDisponibilidadBaterias();

    const btn = document.getElementById('btn-next-2');
    btn.disabled = false;
    btn.className = "px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm transition flex items-center gap-2 shadow cursor-pointer";
}

// --- PASO 3: TENSIÓN, ALMACENAMIENTO & FACTURA ---
function actualizarDisponibilidadBaterias() {
    const elSin = document.getElementById('opt-bat-sin');
    const elCon = document.getElementById('opt-bat-con');
    const aviso = document.getElementById('aviso-almacenamiento');
    const badgeEstado = document.getElementById('badge-almacenamiento-estado');
    if (!elSin || !elCon) return;

    // Resetear estados visuales
    [elSin, elCon].forEach(el => {
        el.classList.remove('pointer-events-none', 'opacity-40', 'bg-slate-100');
    });

    if (state.sistema === 'ongrid') {
        // ON-GRID: Inhabilitar acumulación en gris
        elCon.classList.add('pointer-events-none', 'opacity-40', 'bg-slate-100');
        selectBaterias('sin_baterias');
        if (badgeEstado) badgeEstado.innerHTML = `<span class="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">On-Grid: Sin Baterías</span>`;
        if (aviso) {
            aviso.classList.remove('hidden');
            aviso.innerHTML = `<i class="fa-solid fa-circle-info text-amber-500"></i> Modalidad On-Grid: la acumulación está inhabilitada porque inyecta y toma directo de la red eléctrica.`;
        }
    } else if (state.sistema === 'offgrid') {
        // OFF-GRID: Obligatorio con almacenamiento
        elSin.classList.add('pointer-events-none', 'opacity-40', 'bg-slate-100');
        selectBaterias('con_baterias');
        if (badgeEstado) badgeEstado.innerHTML = `<span class="text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">Off-Grid: Requiere Baterías</span>`;
        if (aviso) {
            aviso.classList.remove('hidden');
            aviso.innerHTML = `<i class="fa-solid fa-circle-info text-indigo-500"></i> Modalidad Off-Grid: el almacenamiento es indispensable para garantizar autonomía.`;
        }
    } else {
        // HÍBRIDO: Ambas opciones habilitadas
        if (badgeEstado) badgeEstado.innerHTML = `<span class="text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">Híbrido: Opcional</span>`;
        if (aviso) aviso.classList.add('hidden');
        if (!state.almacenamiento) {
            selectBaterias('con_baterias');
        }
    }
}

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

// Paso intermedio: Consumo mensual de factura
function actualizarConsumoFactura(val) {
    const kwh = parseFloat(val);
    const box = document.getElementById('box-sugerencia-potencia');
    const lbl = document.getElementById('lbl-potencia-sugerida-factura');

    if (!kwh || kwh <= 0) {
        state.consumoMensualKwh = null;
        state.potenciaSugeridaFactura = null;
        if (box) box.classList.add('hidden');
        return;
    }

    state.consumoMensualKwh = kwh;
    // Factor de generación mensual basado en 4.3 HSP y rendimiento de instalación PR ~0.82
    const factorGeneracionMensual = 4.3 * 30 * 0.82; // ~105.78 kWh/mes por kWp
    const kwpCalculado = Math.round((kwh / factorGeneracionMensual) * 10) / 10;
    state.potenciaSugeridaFactura = Math.max(1, kwpCalculado);

    if (box && lbl) {
        lbl.textContent = `~${state.potenciaSugeridaFactura} kWp`;
        box.classList.remove('hidden');
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

    let min = 1, max = 20, step = 1, defVal = 5;
    let badgeText = "Residencial (1 kW a 20 kW)";
    let ratioText = "1.25 - 1.50 USD/W";

    if (state.tipoProyecto === 'residencial') {
        min = 1; max = 20; step = 1; defVal = 5;
        badgeText = "Residencial (1 kW a 20 kW)";
        ratioText = "1.25 - 1.50 USD/W";
        lblMin.textContent = "1 kW";
        lblMid.textContent = "10 kW";
        lblMax.textContent = "20 kW";
    } else if (state.tipoProyecto === 'industrial') {
        min = 10; max = 100; step = 1; defVal = 30;
        badgeText = "Industrial (10 kW a 100 kW)";
        ratioText = "1.00 - 1.25 USD/W";
        lblMin.textContent = "10 kW";
        lblMid.textContent = "50 kW";
        lblMax.textContent = "100 kW";
    } else if (state.tipoProyecto === 'utility') {
        min = 100; max = 500; step = 10; defVal = 150;
        badgeText = "Utility / Gran Parque (100 kW a 500+ kW)";
        ratioText = "0.75 - 1.00 USD/W";
        lblMin.textContent = "100 kW";
        lblMid.textContent = "300 kW";
        lblMax.textContent = "500 kW";
    } else if (state.tipoProyecto === 'carport') {
        min = 5; max = 150; step = 5; defVal = 20;
        badgeText = "Carport Solar (5 kW a 150 kW)";
        ratioText = "1.80 - 2.00 USD/W";
        lblMin.textContent = "5 kW";
        lblMid.textContent = "75 kW";
        lblMax.textContent = "150 kW";
    }

    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    badge.textContent = badgeText;
    lblRatio.textContent = ratioText;

    // Si viene potencia sugerida de la factura dentro del rango, la priorizamos
    let valorFinal = defVal;
    if (state.potenciaSugeridaFactura && state.potenciaSugeridaFactura >= min && state.potenciaSugeridaFactura <= max) {
        valorFinal = state.potenciaSugeridaFactura;
    } else if (state.potenciaKw && state.potenciaKw >= min && state.potenciaKw <= max) {
        valorFinal = state.potenciaKw;
    }

    slider.value = String(valorFinal);
    actualizarSliderPotencia(slider.value);
}

function actualizarSliderPotencia(val) {
    state.potenciaKw = parseFloat(val);
    document.getElementById('lbl-potencia-valor').textContent = val;

    // Paneles base 650Wp
    const cantPaneles = Math.round((state.potenciaKw * 1000) / 650);
    document.getElementById('lbl-estimacion-paneles').textContent = `Equivale aproximadamente a ~${cantPaneles} paneles de 650Wp`;

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
        industrial: "Proyecto Industrial",
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
    const txtConsumo = state.consumoMensualKwh ? ` • Consumo Factura: ${state.consumoMensualKwh} kWh/m` : '';
    document.getElementById('summary-detalles').textContent = `Tensión: ${txtTens} • Almacenamiento: ${txtBat}${txtConsumo} • Markup Base: ${state.markupGlobal}%`;
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

// --- ESBOZO DE LÓGICA DE AUTO-ARMADO DE KIT SUGERIDO ---
function autoCompletarKits() {
    if (state.catalogo.length === 0) {
        mostrarToast("Catálogo vacío. Conectá a GitHub primero.", "error");
        return;
    }
    state.cotizacionItems = [];
    const potenciaObjetivoW = (state.potenciaKw || 5) * 1000;

    // 1. PANELES SOLARES: Recomendar paneles de la mayor potencia posible en stock
    const panelesDisponibles = state.catalogo
        .filter(p => p.categoria.includes("PANEL") && p.potencia_w > 0 && (!p.disp || p.disp.toLowerCase().includes("stock") || p.disp.toLowerCase().includes("disponible")))
        .sort((a, b) => b.potencia_w - a.potencia_w);

    const panel = panelesDisponibles[0] || state.catalogo.find(p => p.categoria.includes("PANEL")) || state.catalogo[0];
    const potPanel = panel && panel.potencia_w > 0 ? panel.potencia_w : 650;
    const cantPaneles = Math.max(1, Math.ceil(potenciaObjetivoW / potPanel));

    if (panel) {
        state.cotizacionItems.push({
            codigo: panel.codigo,
            descripcion: `${panel.descripcion} (${potPanel}Wp)`,
            categoria: panel.categoria,
            costoBase: panel.costo_base,
            precioVenta: calcularPrecioConMarkup(panel.costo_base),
            iva: panel.iva || 10.5,
            cantidad: cantPaneles
        });
    }

    // 2. KITS DE MONTAJE: Cada 4 paneles se agrega 1 kit (si supera múltiplo de 4, se redondea hacia arriba: necesario + 1)
    const cantKitsEstructura = Math.ceil(cantPaneles / 4);
    const kitEstructura = state.catalogo.find(p =>
        p.categoria.includes("ESTRUCTURA") &&
        (p.descripcion.toUpperCase().includes("4 PANELES") || p.descripcion.toUpperCase().includes("4.8"))
    ) || state.catalogo.find(p => p.categoria.includes("ESTRUCTURA"));

    if (kitEstructura) {
        state.cotizacionItems.push({
            codigo: kitEstructura.codigo,
            descripcion: `${kitEstructura.descripcion} (1 kit c/4 paneles)`,
            categoria: kitEstructura.categoria,
            costoBase: kitEstructura.costo_base,
            precioVenta: calcularPrecioConMarkup(kitEstructura.costo_base),
            iva: kitEstructura.iva || 21,
            cantidad: cantKitsEstructura
        });
    } else {
        state.cotizacionItems.push({
            codigo: 'KIT-EST-4P',
            descripcion: 'Kit de Montaje de Aluminio para 4 Paneles Solares',
            categoria: 'ESTRUCTURAS',
            costoBase: 180.00,
            precioVenta: calcularPrecioConMarkup(180.00),
            iva: 21,
            cantidad: cantKitsEstructura
        });
    }

    // 3. TORNILLOS DE FIJACIÓN: Base 12 tornillos por cada kit de montaje (ítem fuera de lista de precios, editable en tabla)
    const cantTornillos = cantKitsEstructura * 12;
    const costoUnitTornillo = 0.65; // Valor base estimado editable en la tabla
    state.cotizacionItems.push({
        codigo: 'ACC-TORN-FIJ',
        descripcion: 'Tornillos autoperforantes / fijación para estructura (12 u. por kit - s/lista)',
        categoria: 'FIJACIONES',
        costoBase: costoUnitTornillo,
        precioVenta: calcularPrecioConMarkup(costoUnitTornillo),
        iva: 21,
        cantidad: cantTornillos
    });

    // 4. INVERSORES: El más cercano hacia arriba (nunca menor), Deye para Residencial y Huawei para el resto
    const marcaPreferida = state.tipoProyecto === 'residencial' ? 'DEYE' : 'HUAWEI';
    const todosInversores = state.catalogo.filter(p => p.categoria.includes("INVERSOR") && p.potencia_w > 0);

    // Filtrar por modalidad (Híbrido / Off-Grid / On-Grid) y tensión cuando aplique
    let candidatosModalidad = todosInversores.filter(p => {
        const cat = p.categoria.toUpperCase();
        if (state.sistema === 'hibrido') return cat.includes("HÍBRIDO") || cat.includes("HIBRIDO");
        if (state.sistema === 'offgrid') return cat.includes("OFF GRID") || cat.includes("OFF-GRID") || cat.includes("CARGADOR");
        return cat.includes("ON-GRID") || cat.includes("ON GRID");
    });

    // Si hay filtro de tensión (220V vs 380V) y existen candidatos con esa tensión, priorizarlos
    if (state.tension) {
        const tensFiltro = state.tension.toUpperCase(); // '220V' o '380V'
        const conTension = candidatosModalidad.filter(p => p.categoria.toUpperCase().includes(tensFiltro));
        if (conTension.length > 0) candidatosModalidad = conTension;
    }

    if (candidatosModalidad.length === 0) candidatosModalidad = todosInversores;

    // Priorizar marca (Deye en residencial, Huawei en industrial/utility/carport)
    let candidatosMarca = candidatosModalidad.filter(p =>
        p.fabricante.toUpperCase().includes(marcaPreferida) ||
        p.descripcion.toUpperCase().includes(marcaPreferida)
    );

    // Si la marca preferida no tiene en esa modalidad (ej: Huawei en Off-Grid), usar todos los candidatos de la modalidad
    const poolInversores = candidatosMarca.length > 0 ? candidatosMarca : candidatosModalidad;

    // Buscar el más cercano hacia arriba (potencia_w >= potenciaObjetivoW)
    const mayoresOIguales = poolInversores
        .filter(p => p.potencia_w >= potenciaObjetivoW)
        .sort((a, b) => a.potencia_w - b.potencia_w);

    let inversorElegido = null;
    let cantInversores = 1;

    if (mayoresOIguales.length > 0) {
        inversorElegido = mayoresOIguales[0];
        cantInversores = 1;
    } else if (poolInversores.length > 0) {
        // Si la potencia del proyecto supera al inversor individual más grande, usar múltiples del mayor disponible
        const ordenadosDesc = [...poolInversores].sort((a, b) => b.potencia_w - a.potencia_w);
        inversorElegido = ordenadosDesc[0];
        cantInversores = Math.max(1, Math.ceil(potenciaObjetivoW / inversorElegido.potencia_w));
    }

    if (inversorElegido) {
        state.cotizacionItems.push({
            codigo: inversorElegido.codigo,
            descripcion: `${inversorElegido.descripcion} [${(inversorElegido.potencia_w / 1000).toFixed(1)} kW]`,
            categoria: inversorElegido.categoria,
            costoBase: inversorElegido.costo_base,
            precioVenta: calcularPrecioConMarkup(inversorElegido.costo_base),
            iva: inversorElegido.iva || 21,
            cantidad: cantInversores
        });
    }

    // 5. CABLE SOLAR: 10 metros cada 4 paneles (redondeado hacia arriba)
    const metrosCable = Math.ceil(cantPaneles / 4) * 10;
    const rolloCable100m = state.catalogo.find(p =>
        p.categoria.includes("CABLE") && p.descripcion.includes("100") && !p.descripcion.includes("1000")
    ) || state.catalogo.find(p => p.categoria.includes("CABLE"));

    // Si el catálogo tiene el precio del rollo de 100m, obtenemos el costo por metro
    let costoMetroCable = 1.62;
    let descCable = 'Cable Solar Fotovoltaico 6mm² (10m c/4 paneles)';
    let codCable = 'CAB-SOLAR-M';
    if (rolloCable100m) {
        costoMetroCable = rolloCable100m.costo_base > 20 ? (rolloCable100m.costo_base / 100) : rolloCable100m.costo_base;
        descCable = `Cable Solar ${rolloCable100m.descripcion} (Fraccionado por metro: 10m c/4 paneles)`;
        codCable = `${rolloCable100m.codigo}-M`;
    }

    state.cotizacionItems.push({
        codigo: codCable,
        descripcion: descCable,
        categoria: 'CABLE SOLAR',
        costoBase: costoMetroCable,
        precioVenta: calcularPrecioConMarkup(costoMetroCable),
        iva: 21,
        cantidad: metrosCable
    });

    renderizarCotizacion();
    mostrarToast(`Kit auto-armado: ${cantPaneles} paneles, ${cantKitsEstructura} kits, ${cantTornillos} tornillos, inversor ${marcaPreferida} y ${metrosCable}m de cable.`, "success");
}

// --- TABLA DE COTIZACIÓN (PRODUCTOS SIN IVA + IVA AL FINAL) ---
function renderizarCotizacion() {
    const tbody = document.getElementById('tabla-cotizacion-body');

    if (state.cotizacionItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-10 text-slate-400 italic">
                    No hay ítems cargados en la cotización.<br>
                    Hacé clic en <b>"Auto-armar Kit Sugerido"</b> o agregá productos individualmente desde el panel izquierdo.
                </td>
            </tr>
        `;
        actualizarTotalesVista(0, 0);
        return;
    }

    tbody.innerHTML = '';
    let subtotalNetoGral = 0;
    let totalIvaGral = 0;

    state.cotizacionItems.forEach((item, index) => {
        const subItemSinIva = item.precioVenta * item.cantidad;
        const ivaItem = subItemSinIva * ((item.iva || 21) / 100);
        subtotalNetoGral += subItemSinIva;
        totalIvaGral += ivaItem;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100 transition">
                <td class="py-2.5 px-3 font-bold text-slate-800">
                    <input type="number" min="1" value="${item.cantidad}" onchange="modificarCantidadItem(${index}, this.value)" class="w-14 border border-slate-200 rounded-lg py-1 px-1.5 text-center font-bold focus:ring-1 focus:ring-amber-500 outline-none">
                </td>
                <td class="py-2.5 px-3">
                    <span class="font-bold text-slate-900 block">${item.descripcion}</span>
                    <span class="text-[10px] text-slate-400 font-mono">SKU: ${item.codigo} &bull; Cat: ${item.categoria} &bull; Alíc. IVA: ${item.iva || 21}%</span>
                </td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                    <div class="inline-flex items-center justify-end gap-1">
                        <span class="text-slate-400">$</span>
                        <input type="number" step="0.01" min="0" value="${item.precioVenta.toFixed(2)}" onchange="modificarPrecioUnitarioItem(${index}, this.value)" class="w-20 border border-slate-200 rounded-lg py-1 px-1.5 text-right font-mono text-xs font-semibold focus:ring-1 focus:ring-amber-500 outline-none" title="Precio unitario de venta SIN IVA">
                    </div>
                </td>
                <td class="py-2.5 px-3 text-right font-mono font-black text-slate-900">$${subItemSinIva.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="py-2.5 px-3 text-center">
                    <button onclick="eliminarItem(${index})" class="text-rose-500 hover:text-rose-700 p-1" title="Eliminar ítem">
                        <i class="fa-solid fa-xmark text-sm font-bold"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Agregar fila de IVA como un ítem más al final de la suma
    tbody.innerHTML += `
        <tr class="bg-amber-50/60 border-t-2 border-slate-200">
            <td class="py-2.5 px-3 text-center font-bold text-amber-800">1</td>
            <td class="py-2.5 px-3">
                <span class="font-bold text-slate-800 block">IVA (Impuesto al Valor Agregado)</span>
                <span class="text-[10px] text-slate-500 font-mono">Calculado sobre el subtotal neto de los equipos e insumos</span>
            </td>
            <td class="py-2.5 px-3 text-right font-mono text-slate-600">$${totalIvaGral.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="py-2.5 px-3 text-right font-mono font-black text-amber-800">$${totalIvaGral.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="py-2.5 px-3 text-center text-[10px] font-bold text-slate-400">IMP</td>
        </tr>
    `;

    actualizarTotalesVista(subtotalNetoGral, totalIvaGral);
}

function modificarCantidadItem(index, valor) {
    const cant = parseInt(valor);
    if (cant > 0) {
        state.cotizacionItems[index].cantidad = cant;
        renderizarCotizacion();
    }
}

function modificarPrecioUnitarioItem(index, valor) {
    const nuevoPrecio = parseFloat(valor);
    if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
        state.cotizacionItems[index].precioVenta = nuevoPrecio;
        const margen = parseFloat(state.markupGlobal) || 0;
        state.cotizacionItems[index].costoBase = nuevoPrecio / (1 + (margen / 100));
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

// --- IDENTIFICACIÓN DEL CLIENTE Y PRESUPUESTOS GUARDADOS ---
function inicializarIdCliente() {
    const guardados = obtenerPresupuestosGuardados();
    const num = guardados.length + 1;
    const idSugerido = `GSE-${String(num).padStart(3, '0')}`;
    sincronizarDatosCliente('id', idSugerido);
}

function sincronizarDatosCliente(campo, valor) {
    if (campo === 'id') {
        state.clienteId = valor;
        const p1 = document.getElementById('inp-cliente-id-p1');
        const p5 = document.getElementById('inp-cliente-id-p5');
        if (p1 && p1.value !== valor) p1.value = valor;
        if (p5 && p5.value !== valor) p5.value = valor;
    } else if (campo === 'nombre') {
        state.clienteNombre = valor;
        const p1 = document.getElementById('inp-cliente-nombre-p1');
        const p5 = document.getElementById('inp-cliente-nombre-p5');
        if (p1 && p1.value !== valor) p1.value = valor;
        if (p5 && p5.value !== valor) p5.value = valor;
    } else if (campo === 'ubicacion') {
        state.clienteUbicacion = valor;
        const p1 = document.getElementById('inp-cliente-ubicacion-p1');
        const p5 = document.getElementById('inp-cliente-ubicacion-p5');
        if (p1 && p1.value !== valor) p1.value = valor;
        if (p5 && p5.value !== valor) p5.value = valor;
    }
}

function obtenerPresupuestosGuardados() {
    try {
        return JSON.parse(localStorage.getItem('gse_presupuestos_guardados') || '[]');
    } catch (e) {
        return [];
    }
}

function actualizarContadorGuardados() {
    const guardados = obtenerPresupuestosGuardados();
    const badge = document.getElementById('badge-cant-guardados');
    if (badge) badge.textContent = guardados.length;
}

function guardarPresupuestoActual() {
    if (state.cotizacionItems.length === 0) {
        mostrarToast("Agregá al menos un ítem o auto-armá el kit antes de guardar.", "error");
        return;
    }

    const id = (state.clienteId || '').trim() || `GSE-${Date.now().toString().slice(-4)}`;
    const nombre = (state.clienteNombre || '').trim() || 'Cliente Sin Nombre';
    const ubicacion = (state.clienteUbicacion || '').trim() || '-';

    let subtotal = 0, iva = 0;
    state.cotizacionItems.forEach(i => {
        const sub = i.precioVenta * i.cantidad;
        subtotal += sub;
        iva += sub * ((i.iva || 21) / 100);
    });

    const registro = {
        id: id,
        clienteNombre: nombre,
        clienteUbicacion: ubicacion,
        fecha: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipoProyecto: state.tipoProyecto || 'residencial',
        sistema: state.sistema || 'ongrid',
        tension: state.tension || '220v',
        almacenamiento: state.almacenamiento || 'sin_baterias',
        potenciaKw: state.potenciaKw || 5,
        markupGlobal: state.markupGlobal || 50,
        consumoMensualKwh: state.consumoMensualKwh,
        cotizacionItems: JSON.parse(JSON.stringify(state.cotizacionItems)),
        totalFinalUsd: subtotal + iva
    };

    const guardados = obtenerPresupuestosGuardados();
    const idxExistente = guardados.findIndex(p => p.id.toUpperCase() === id.toUpperCase());
    if (idxExistente !== -1) {
        guardados[idxExistente] = registro;
    } else {
        guardados.unshift(registro);
    }

    localStorage.setItem('gse_presupuestos_guardados', JSON.stringify(guardados));
    actualizarContadorGuardados();
    mostrarToast(`Presupuesto ${id} (${nombre}) guardado con éxito.`, "success");
}

function abrirModalPresupuestos() {
    const modal = document.getElementById('modal-presupuestos');
    if (modal) {
        modal.classList.remove('hidden');
        renderizarListaPresupuestos('');
    }
}

function cerrarModalPresupuestos() {
    const modal = document.getElementById('modal-presupuestos');
    if (modal) modal.classList.add('hidden');
}

function renderizarListaPresupuestos(filtro = '') {
    const cont = document.getElementById('lista-presupuestos-body');
    if (!cont) return;

    const guardados = obtenerPresupuestosGuardados();
    const q = filtro.trim().toLowerCase();
    const filtrados = guardados.filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.clienteNombre.toLowerCase().includes(q) ||
        (p.clienteUbicacion && p.clienteUbicacion.toLowerCase().includes(q)) ||
        (p.tipoProyecto && p.tipoProyecto.toLowerCase().includes(q))
    );

    if (filtrados.length === 0) {
        cont.innerHTML = `
            <div class="text-center py-10 text-slate-400 text-xs italic">
                No se encontraron presupuestos guardados${q ? ` para "${filtro}"` : ''}.
            </div>
        `;
        return;
    }

    cont.innerHTML = filtrados.map(p => `
        <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-brand-500 bg-white shadow-sm transition">
            <div>
                <div class="flex items-center gap-2">
                    <span class="bg-amber-100 text-amber-900 font-mono font-black text-xs px-2 py-0.5 rounded-lg">${p.id}</span>
                    <h4 class="font-bold text-slate-900 text-sm">${p.clienteNombre}</h4>
                    <span class="text-[11px] text-slate-400">&bull; ${p.clienteUbicacion || '-'}</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">
                    <b class="uppercase text-slate-700">${p.tipoProyecto}</b> (${p.potenciaKw} kWp - ${p.sistema}) &bull; ${p.cotizacionItems.length} ítems &bull; Guardado: ${p.fecha}
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-mono font-black text-emerald-600 text-sm mr-2">$${(p.totalFinalUsd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</span>
                <button onclick="cargarPresupuestoGuardado('${p.id}')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition">
                    <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> Abrir
                </button>
                <button onclick="eliminarPresupuestoGuardado('${p.id}')" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition" title="Eliminar">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function cargarPresupuestoGuardado(id) {
    const guardados = obtenerPresupuestosGuardados();
    const p = guardados.find(x => x.id === id);
    if (!p) return;

    sincronizarDatosCliente('id', p.id);
    sincronizarDatosCliente('nombre', p.clienteNombre);
    sincronizarDatosCliente('ubicacion', p.clienteUbicacion || '');

    if (p.tipoProyecto) selectTipoProyecto(p.tipoProyecto);
    if (p.sistema) selectSistema(p.sistema);
    if (p.tension) selectTension(p.tension);
    if (p.almacenamiento) selectBaterias(p.almacenamiento);

    state.potenciaKw = p.potenciaKw || 5;
    state.markupGlobal = p.markupGlobal || 50;
    const inpMarkup = document.getElementById('cfg-markup-global');
    if (inpMarkup) inpMarkup.value = state.markupGlobal;

    state.cotizacionItems = JSON.parse(JSON.stringify(p.cotizacionItems || []));

    cerrarModalPresupuestos();
    setVista('wizard');
    irAPaso(5);
    mostrarToast(`Presupuesto ${p.id} (${p.clienteNombre}) cargado.`, "success");
}

function eliminarPresupuestoGuardado(id) {
    if (!confirm(`¿Eliminar el presupuesto ${id}?`)) return;
    let guardados = obtenerPresupuestosGuardados();
    guardados = guardados.filter(x => x.id !== id);
    localStorage.setItem('gse_presupuestos_guardados', JSON.stringify(guardados));
    actualizarContadorGuardados();
    const inp = document.getElementById('input-buscar-presupuesto');
    renderizarListaPresupuestos(inp ? inp.value : '');
    mostrarToast(`Presupuesto ${id} eliminado.`);
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