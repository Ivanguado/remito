// Variables globales
let clientes = [];
let productos = [];
let lineasRemito = [];
let contadorLineas = 0;
let clienteEditando = null;
let productoEditando = null;
let contadorRemitos = 1; // Contador automático de remitos

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
});

// Función principal de inicialización
async function inicializarApp() {
    try {
        console.log('Inicializando aplicación...');
        await cargarDatos();
        console.log('Datos cargados, productos disponibles:', productos.length);
        configurarFechaActual();
        cargarContadorRemitos();
        configurarEventos();
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error al cargar los datos. Verifique que los archivos JSON estén disponibles.');
    }
}

// Cargar datos desde archivos JSON
async function cargarDatos() {
    try {
        // Cargar datos directamente desde los archivos JSON (hardcodeados)
            await cargarDatosDirectos();
        
        // NO cargar productos al inicializar - solo cuando se busque
        
        // No cargar datos del localStorage - solo usar JSON
        
        // Cargar tablas de gestión
        cargarTablaClientes();
        cargarTablaProductos();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        throw error;
    }
}

// Buscar clientes con autocompletado
function buscarClientes(termino) {
    if (termino.length < 1) {
        ocultarSugerencias('cliente-suggestions');
        return;
    }
    
    const terminoLower = termino.toLowerCase();
    const clientesFiltrados = clientes.filter(cliente => 
        cliente.senor.toLowerCase().includes(terminoLower) ||
        cliente.localidad.toLowerCase().includes(terminoLower)
    );
    
    mostrarSugerencias('cliente-suggestions', clientesFiltrados, termino, 'cliente');
}

// Mostrar sugerencias de autocompletado
window.mostrarSugerencias = function(containerId, items, termino, tipo, lineaId = null) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        return;
    }
    
    // Limpiar contenido anterior
    container.innerHTML = '';
    
    if (items.length === 0) {
        console.log('No hay items, ocultando sugerencias');
        ocultarSugerencias(containerId);
        return;
    }
    
    // Crear fragmento para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        let texto = '';
        if (tipo === 'cliente') {
            texto = `${item.senor} - ${item.localidad}`;
        } else if (tipo === 'producto') {
            texto = item.nombre;
        }
        
        // Resaltar el término buscado
        const textoResaltado = resaltarTexto(texto, termino);
        div.innerHTML = textoResaltado;
        
        // Event listener más eficiente
        div.addEventListener('click', () => {
            console.log(`Item clickeado: ${texto}`);
            if (tipo === 'cliente') {
                seleccionarItem(item, tipo);
            } else if (tipo === 'producto' && lineaId) {
                actualizarProducto(lineaId, item);
            }
            ocultarSugerencias(containerId);
        });
        
        fragment.appendChild(div);
    });
    
    // Agregar todo de una vez
    container.appendChild(fragment);
    container.style.display = 'block';
    
    // Posicionar el contenedor correctamente
    if (tipo === 'producto') {
        const input = document.querySelector(`input[oninput*="${lineaId}"]`);
        if (input) {
            const rect = input.getBoundingClientRect();
            container.style.position = 'fixed';
            container.style.top = (rect.bottom + 5) + 'px';
            container.style.left = rect.left + 'px';
            container.style.width = rect.width + 'px';
        }
    }
};

// Ocultar sugerencias
window.ocultarSugerencias = function(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
    container.style.display = 'none';
    }
};

// Resaltar texto en las sugerencias
function resaltarTexto(texto, termino) {
    const terminoLower = termino.toLowerCase();
    const textoLower = texto.toLowerCase();
    const indice = textoLower.indexOf(terminoLower);
    
    if (indice === -1) return texto;
    
    const antes = texto.substring(0, indice);
    const coincidencia = texto.substring(indice, indice + termino.length);
    const despues = texto.substring(indice + termino.length);
    
    return `${antes}<span class="suggestion-highlight">${coincidencia}</span>${despues}`;
}

// Seleccionar item del autocompletado
function seleccionarItem(item, tipo) {
    if (tipo === 'cliente') {
        document.getElementById('cliente').value = item.senor;
        document.getElementById('domicilio').value = item.domicilio;
        document.getElementById('localidad').value = item.localidad;
    } else if (tipo === 'producto') {
        // Esta función se usará para productos
        return item;
    }
}

// Función para obtener productos del JSON
async function obtenerProductosDelJSON() {
    // Retornar productos ya cargados en el array productos
    console.log(`📦 Retornando ${productos.length} productos ya cargados`);
    return productos;
}

// Buscar productos con autocompletado
// Debounce para mejorar eficiencia
let debounceTimer = null;

// Variable para almacenar productos cargados dinámicamente
let productosCargados = [];

// Función global para buscar productos
window.buscarProductos = function(lineaId, termino) {
    if (termino.length < 1) {
        ocultarSugerencias(`producto-${lineaId}-suggestions`);
        return;
    }
    
    const terminoLower = termino.toLowerCase();
    const productosFiltrados = productos.filter(producto => 
        producto.nombre && producto.nombre.toLowerCase().includes(terminoLower)
    );
    
    mostrarSugerencias(`producto-${lineaId}-suggestions`, productosFiltrados, termino, 'producto', lineaId);
};

// Actualizar producto seleccionado
function actualizarProducto(lineaId, producto) {
    const linea = lineasRemito.find(l => l.id === lineaId);
    if (linea) {
        linea.productoId = producto.id;
        linea.nombre = producto.nombre;
        linea.descripcion = producto.descripcion;
        linea.unidades_por_bulto = producto.unidades_por_bulto;
        linea.descripcion_bulto = producto.descripcion_bulto;
        linea.precio = producto.precio_bulto;
        linea.total = linea.cantidad * linea.precio;
        
        renderizarTabla();
        calcularTotalGeneral();
    }
}


// Agregar nueva línea de producto
function agregarLinea() {
    contadorLineas++;
    const nuevaLinea = {
        id: `linea_${contadorLineas}`,
        cantidad: 1, // Cantidad en unidades
        productoId: '',
        nombre: '',
        descripcion: '',
        unidades_por_bulto: 0,
        descripcion_bulto: '',
        precio: 0,
        total: 0
    };
    
    lineasRemito.push(nuevaLinea);
    renderizarTabla();
}

// Eliminar línea de producto
function eliminarLinea(lineaId) {
    lineasRemito = lineasRemito.filter(linea => linea.id !== lineaId);
    renderizarTabla();
    calcularTotalGeneral();
}

// Renderizar tabla de productos
function renderizarTabla() {
    const tbody = document.getElementById('productos-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    lineasRemito.forEach(linea => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="position: relative;">
                    <input type="text" 
                           class="table-input" 
                           value="${linea.nombre}" 
                           placeholder="Buscar producto..."
                           oninput="buscarProductos('${linea.id}', this.value)"
                           onfocus="buscarProductos('${linea.id}', this.value)"
                           onblur="setTimeout(() => ocultarSugerencias('producto-${linea.id}-suggestions'), 200)">
                    <div id="producto-${linea.id}-suggestions" class="suggestions"></div>
                </div>
            </td>
            <td>
                <input type="number" 
                       class="table-input" 
                       value="${linea.cantidad}" 
                       min="1" 
                       onchange="actualizarCantidad('${linea.id}', this.value)">
            </td>
            <td>${linea.descripcion_bulto || ''}</td>
            <td>$${formatearNumero(linea.precio || 0)}</td>
            <td>$${formatearNumero(linea.total || 0)}</td>
            <td>
                <button onclick="eliminarLinea('${linea.id}')" class="btn-eliminar">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Actualizar cantidad de producto
function actualizarCantidad(lineaId, nuevaCantidad) {
    const linea = lineasRemito.find(l => l.id === lineaId);
    if (linea) {
        linea.cantidad = parseInt(nuevaCantidad) || 1;
        linea.total = linea.cantidad * linea.precio;
        renderizarTabla();
        calcularTotalGeneral();
    }
}

// Calcular total general
function calcularTotalGeneral() {
    const total = lineasRemito.reduce((sum, linea) => sum + linea.total, 0);
    const totalElement = document.getElementById('total-general');
    if (totalElement) {
        totalElement.innerHTML = `<strong>$${formatearNumero(total)}</strong>`;
    }
}

// Formatear número con separadores de miles
function formatearNumero(numero) {
    return new Intl.NumberFormat('es-AR').format(numero);
}

// Configurar fecha actual
function configurarFechaActual() {
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        const hoy = new Date();
        const fechaFormateada = hoy.toISOString().split('T')[0];
        fechaInput.value = fechaFormateada;
    }
}

// Configurar eventos
function configurarEventos() {
    // Eventos ya configurados en el HTML
}

// Cargar tabla de clientes
function cargarTablaClientes() {
    // Implementar si es necesario
}

// Cargar contador de remitos desde localStorage
function cargarContadorRemitos() {
    try {
        const contadorGuardado = localStorage.getItem('contadorRemitos');
        if (contadorGuardado) {
            contadorRemitos = parseInt(contadorGuardado);
        }
        configurarNumeroRemito();
    } catch (error) {
        console.error('Error al cargar contador de remitos:', error);
        configurarNumeroRemito();
    }
}

// Configurar número de remito automático
function configurarNumeroRemito() {
    const numeroRemitoInput = document.getElementById('numero-remito');
    if (numeroRemitoInput) {
        numeroRemitoInput.value = `REM-${contadorRemitos.toString().padStart(3, '0')}`;
    }
}

// Incrementar contador de remitos
function incrementarContadorRemitos() {
    contadorRemitos++;
    localStorage.setItem('contadorRemitos', contadorRemitos.toString());
    configurarNumeroRemito();
}

// Cargar tabla de productos
function cargarTablaProductos() {
    // Implementar si es necesario
}

// Mostrar error
function mostrarError(mensaje) {
    console.error(mensaje);
    alert(mensaje);
}

// Generar PDF del remito usando html2pdf.js
function generarPDF() {
    try {
        // Obtener datos del formulario
        const clienteInput = document.getElementById('cliente');
        const fechaInput = document.getElementById('fecha');
        const numeroRemitoInput = document.getElementById('numero-remito');
        
        if (!clienteInput || !fechaInput || !numeroRemitoInput) {
            mostrarError('No se encontraron los campos del formulario');
            return;
        }
        
        const cliente = clienteInput.value.trim();
        const fecha = fechaInput.value;
        const numeroRemito = numeroRemitoInput.value.trim();
        
        // Validar datos requeridos
        if (!cliente) {
            mostrarError('Debe seleccionar un cliente');
            return;
        }
        
        if (!numeroRemito) {
            mostrarError('Debe ingresar un número de remito');
            return;
        }
        
        if (lineasRemito.length === 0) {
            mostrarError('Debe agregar al menos un producto');
            return;
        }
        
        // Calcular totales
        const subtotal = lineasRemito.reduce((sum, linea) => sum + linea.total, 0);
        
        // Crear elemento temporal para el PDF
        const elementoPDF = document.createElement('div');
        elementoPDF.innerHTML = `
            <div style="font-family: Arial, sans-serif; margin: 20px; max-width: 800px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 28px;">REMITO</h1>
                    <h2 style="margin: 10px 0; font-size: 20px;">N° ${numeroRemito}</h2>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="margin-bottom: 5px;"><strong>Fecha:</strong> ${fecha}</div>
                    <div style="margin-bottom: 5px;"><strong>Cliente:</strong> ${cliente}</div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Producto</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cantidad por Unidad</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descripción por Bulto</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Precio Unit.</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lineasRemito.map(linea => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${linea.nombre || ''}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${linea.cantidad || 1}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${linea.descripcion_bulto || ''}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">$${formatearNumero(linea.precio || 0)}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">$${formatearNumero(linea.total || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="text-align: right; font-weight: bold; font-size: 18px; margin-bottom: 30px;">
                    <strong>TOTAL: $${formatearNumero(subtotal)}</strong>
                </div>
            </div>
        `;
        
        // Configuración para html2pdf.js
        const opciones = {
            margin: 10,
            filename: `Remito_${numeroRemito}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Abrir ventana nueva con opciones de imprimir/descargar PDF
        const ventanaPDF = window.open('', '_blank', 'width=800,height=600');
        
        // Crear contenido HTML completo para la ventana
        const contenidoHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Remito ${numeroRemito}</title>
                <style>
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        line-height: 1.4;
                    }
                    .print-button {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        z-index: 1000;
                    }
                    .print-button:hover {
                        background: #0056b3;
                    }
                    .download-button {
                        position: fixed;
                        top: 10px;
                        right: 150px;
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        z-index: 1000;
                    }
                    .download-button:hover {
                        background: #1e7e34;
                    }
                </style>
            </head>
            <body>
                <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
                <button class="download-button no-print" onclick="descargarPDF()">📄 Descargar PDF</button>
                ${elementoPDF.innerHTML}
                
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
                <script>
                    function descargarPDF() {
                        try {
                            // Esperar a que html2pdf se cargue
                            setTimeout(() => {
                                if (typeof html2pdf !== 'undefined') {
                                    const opciones = {
                                        margin: 10,
                                        filename: 'Remito_${numeroRemito}.pdf',
                                        image: { type: 'jpeg', quality: 0.98 },
                                        html2canvas: { scale: 2 },
                                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                    };
                                    
                                    // Crear elemento limpio sin botones
                                    const elementoLimpio = document.createElement('div');
                                    elementoLimpio.innerHTML = document.body.innerHTML;
                                    
                                    // Remover botones
                                    const botones = elementoLimpio.querySelectorAll('button');
                                    botones.forEach(boton => boton.remove());
                                    
                                    // Generar y descargar PDF
                                    html2pdf().set(opciones).from(elementoLimpio).save();
                                    
                                    console.log('PDF generado y descargado correctamente');
                                } else {
                                    alert('html2pdf.js no está disponible. Recargue la página e intente nuevamente.');
                                }
                            }, 1000);
                        } catch (error) {
                            console.error('Error al descargar PDF:', error);
                            alert('Error al generar PDF: ' + error.message);
                        }
                    }
                </script>
            </body>
            </html>
        `;
        
        // Escribir contenido en la ventana.
        ventanaPDF.document.write(contenidoHTML);
        ventanaPDF.document.close();
        
        // Enfocar la ventana
        ventanaPDF.focus();
        
        // Guardar conteo de unidades vendidas en localStorage
        guardarConteoUnidades();
        
        // Limpiar formulario después de generar PDF
        limpiarFormulario();
        
        console.log('✅ PDF generado correctamente con html2pdf.js');
        
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        mostrarError('Error al generar el PDF: ' + error.message);
    }
}

// Limpiar formulario después de generar PDF
function limpiarFormulario() {
    try {
        // Limpiar datos del cliente
        const clienteInput = document.getElementById('cliente');
        if (clienteInput) {
            clienteInput.value = '';
        }
        
        // Limpiar número de remito
        const numeroRemitoInput = document.getElementById('numero-remito');
        if (numeroRemitoInput) {
            numeroRemitoInput.value = '';
        }
        
        // Limpiar detalle de productos
        lineasRemito = [];
        contadorLineas = 0;
        
        // Actualizar la tabla de productos
        renderizarTabla();
        
        // Actualizar el total general
        calcularTotalGeneral();
        
        // Incrementar contador de remitos para el próximo
        incrementarContadorRemitos();
        
        // Ocultar sugerencias si están visibles
        ocultarSugerencias('cliente-suggestions');
        
        console.log('✅ Formulario limpiado correctamente');
        
    } catch (error) {
        console.error('❌ Error al limpiar formulario:', error);
    }
}

// Ver resumen del remito
function verResumen() {
    try {
        const clienteInput = document.getElementById('cliente');
        const fechaInput = document.getElementById('fecha');
        const numeroRemitoInput = document.getElementById('numero-remito');
        
        if (!clienteInput || !fechaInput || !numeroRemitoInput) {
            mostrarError('No se encontraron los campos del formulario');
            return;
        }
        
        const cliente = clienteInput.value.trim();
        const fecha = fechaInput.value;
        const numeroRemito = numeroRemitoInput.value.trim();
        
        const totalProductos = lineasRemito.length;
        const totalCantidad = lineasRemito.reduce((sum, linea) => sum + (linea.cantidad || 1), 0);
        const totalMonto = lineasRemito.reduce((sum, linea) => sum + (linea.total || 0), 0);
        
        const resumen = `
📊 RESUMEN DEL REMITO N° ${numeroRemito}

📅 Fecha: ${fecha}
👤 Cliente: ${cliente || 'No especificado'}

📦 Productos: ${totalProductos}
🔢 Cantidad total: ${totalCantidad}
💰 Monto total: $${formatearNumero(totalMonto)}

${lineasRemito.length > 0 ? '📋 Detalle de productos:' : ''}
${lineasRemito.map((linea, index) => 
    `${index + 1}. ${linea.nombre || 'Sin nombre'} - Cant: ${linea.cantidad || 1} - $${formatearNumero(linea.total || 0)}`
).join('\n')}
        `;
        
        alert(resumen);
        
    } catch (error) {
        console.error('❌ Error al mostrar resumen:', error);
        mostrarError('Error al mostrar el resumen: ' + error.message);
    }
}

// Exportar datos a CSV
function exportarCSV() {
    try {
        const clienteInput = document.getElementById('cliente');
        const fechaInput = document.getElementById('fecha');
        const numeroRemitoInput = document.getElementById('numero-remito');
        
        if (!clienteInput || !fechaInput || !numeroRemitoInput) {
            mostrarError('No se encontraron los campos del formulario');
            return;
        }
        
        const cliente = clienteInput.value.trim();
        const fecha = fechaInput.value;
        const numeroRemito = numeroRemitoInput.value.trim();
        
        if (!cliente || !numeroRemito || lineasRemito.length === 0) {
            mostrarError('Debe completar todos los campos y agregar productos');
            return;
        }
        
        // Crear contenido CSV
        const csvContent = [
            ['REMITO', numeroRemito],
            ['Fecha', fecha],
            ['Cliente', cliente],
            [''],
            ['Producto', 'Cantidad', 'Descripción', 'Precio Unit.', 'Total'],
            ...lineasRemito.map(linea => [
                linea.nombre || '',
                linea.cantidad || 1,
                linea.descripcion_bulto || '',
                linea.precio || 0,
                linea.total || 0
            ]),
            [''],
            ['TOTAL', '', '', '', lineasRemito.reduce((sum, linea) => sum + linea.total, 0)]
        ].map(row => row.join(',')).join('\n');
        
        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Remito_${numeroRemito}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ CSV exportado correctamente');
        
    } catch (error) {
        console.error('❌ Error al exportar CSV:', error);
        mostrarError('Error al exportar CSV: ' + error.message);
    }
}

// Borrar todo el contenido del remito
function borrarTodo() {
    if (confirm('¿Está seguro que desea borrar todo el contenido del remito?')) {
        try {
            // Limpiar campos del formulario
            const clienteInput = document.getElementById('cliente');
            const domicilioInput = document.getElementById('domicilio');
            const localidadInput = document.getElementById('localidad');
            const fechaInput = document.getElementById('fecha');
            const numeroRemitoInput = document.getElementById('numero-remito');
            
            if (clienteInput) clienteInput.value = '';
            if (domicilioInput) domicilioInput.value = '';
            if (localidadInput) localidadInput.value = '';
            if (numeroRemitoInput) numeroRemitoInput.value = '';
            
            // Limpiar líneas de productos
            lineasRemito = [];
            contadorLineas = 0;
            
            // Re-renderizar tabla
            renderizarTabla();
            calcularTotalGeneral();
            
            console.log('✅ Contenido borrado correctamente');
            
        } catch (error) {
            console.error('❌ Error al borrar contenido:', error);
            mostrarError('Error al borrar contenido: ' + error.message);
        }
    }
}

// Sistema de conteo de unidades vendidas
function guardarConteoUnidades() {
    try {
        // Obtener conteo actual del localStorage
        const conteoActual = JSON.parse(localStorage.getItem('conteoUnidades') || '{}');
        
        // Procesar cada línea del remito
        lineasRemito.forEach(linea => {
            if (linea.productoId && linea.cantidad > 0) {
                const productoId = linea.productoId;
                const cantidadVendida = linea.cantidad;
                
                // Agregar al conteo existente
                if (conteoActual[productoId]) {
                    conteoActual[productoId].cantidadTotal += cantidadVendida;
                    conteoActual[productoId].ultimaVenta = new Date().toISOString();
                } else {
                    // Crear nueva entrada
                    const producto = productos.find(p => p.id === productoId);
                    conteoActual[productoId] = {
                        nombre: linea.nombre || 'Producto sin nombre',
                        cantidadTotal: cantidadVendida,
                        primeraVenta: new Date().toISOString(),
                        ultimaVenta: new Date().toISOString(),
                        descripcion: linea.descripcion_bulto || '',
                        precioUnitario: linea.precio || 0
                    };
                }
            }
        });
        
        // Guardar en localStorage
        localStorage.setItem('conteoUnidades', JSON.stringify(conteoActual));
        
        console.log('✅ Conteo de unidades guardado en localStorage');
        console.log('Conteo actualizado:', conteoActual);
        
    } catch (error) {
        console.error('❌ Error al guardar conteo de unidades:', error);
    }
}

// Obtener conteo de unidades vendidas
function obtenerConteoUnidades() {
    try {
        const conteo = JSON.parse(localStorage.getItem('conteoUnidades') || '{}');
        return conteo;
    } catch (error) {
        console.error('❌ Error al obtener conteo de unidades:', error);
        return {};
    }
}

// Generar pedido a proveedor
function generarPedidoProveedor() {
    try {
        const conteo = obtenerConteoUnidades();
        const productosConVentas = Object.entries(conteo);
        
        if (productosConVentas.length === 0) {
            alert('No hay productos vendidos para generar pedido.');
            return;
        }
        
        // Crear contenido del pedido
        const fechaPedido = new Date().toLocaleDateString('es-AR');
        let contenidoPedido = `
            <div style="font-family: Arial, sans-serif; margin: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1>PEDIDO A PROVEEDOR</h1>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Producto</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unidades por Bulto</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descripción Bulto</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unidades Vendidas</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Bultos a Pedir</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let totalUnidades = 0;
        let totalBultos = 0;
        
        productosConVentas.forEach(([productoId, datos]) => {
            // Buscar el producto original para obtener unidades_por_bulto
            const productoOriginal = productos.find(p => p.id === productoId);
            const unidadesPorBulto = productoOriginal ? productoOriginal.unidades_por_bulto : 1;
            const bultosAPedir = Math.ceil(datos.cantidadTotal / unidadesPorBulto);
            
            contenidoPedido += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${datos.nombre}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${unidadesPorBulto}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${productoOriginal ? productoOriginal.descripcion_bulto : ''}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${datos.cantidadTotal}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${bultosAPedir}</td>
                </tr>
            `;
            
            totalUnidades += datos.cantidadTotal;
            totalBultos += bultosAPedir;
        });
        
        contenidoPedido += `
                    </tbody>
                </table>
                
                <div style="text-align: right; font-weight: bold; font-size: 18px; margin-bottom: 30px;">
                    <div>Total productos diferentes: ${productosConVentas.length}</div>
                    <div>Total unidades vendidas: ${totalUnidades}</div>
                    <div>Total bultos a pedir: ${totalBultos}</div>
                </div>
            </div>
        `;
        
        // Mostrar pedido en ventana nueva
        const ventanaPedido = window.open('', '_blank', 'width=800,height=600');
        ventanaPedido.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Pedido a Proveedor - ${fechaPedido}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .download-button {
                        position: fixed; top: 10px; right: 10px;
                        background: #28a745; color: white; border: none;
                        padding: 10px 20px; border-radius: 5px; cursor: pointer;
                        font-size: 14px; z-index: 1000;
                    }
                    .download-button:hover {
                        background: #1e7e34;
                    }
                </style>
            </head>
            <body>
                <button class="download-button" onclick="descargarPDF()">📄 Descargar PDF</button>
                ${contenidoPedido}
                
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
                <script>
                    function descargarPDF() {
                        try {
                            // Esperar a que html2pdf se cargue
                            setTimeout(() => {
                                if (typeof html2pdf !== 'undefined') {
                                    const opciones = {
                                        margin: 10,
                                        filename: 'Pedido_Proveedor_${fechaPedido}.pdf',
                                        image: { type: 'jpeg', quality: 0.98 },
                                        html2canvas: { scale: 2 },
                                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                    };
                                    
                                    // Crear elemento limpio sin botones
                                    const elementoLimpio = document.createElement('div');
                                    elementoLimpio.innerHTML = document.body.innerHTML;
                                    
                                    // Remover botones
                                    const botones = elementoLimpio.querySelectorAll('button');
                                    botones.forEach(boton => boton.remove());
                                    
                                    // Generar y descargar PDF
                                    html2pdf().set(opciones).from(elementoLimpio).save();
                                    
                                    console.log('PDF del pedido generado y descargado correctamente');
                                } else {
                                    alert('html2pdf.js no está disponible. Recargue la página e intente nuevamente.');
                                }
                            }, 1000);
                        } catch (error) {
                            console.error('Error al descargar PDF:', error);
                            alert('Error al generar PDF: ' + error.message);
                        }
                    }
                </script>
            </body>
            </html>
        `);
        ventanaPedido.document.close();
        ventanaPedido.focus();
        
        console.log('✅ Pedido a proveedor generado');
        
    } catch (error) {
        console.error('❌ Error al generar pedido a proveedor:', error);
        mostrarError('Error al generar pedido: ' + error.message);
    }
}

// Limpiar conteo de unidades (para reiniciar)
function limpiarConteoUnidades() {
    if (confirm('¿Está seguro que desea limpiar todo el conteo de unidades vendidas y reiniciar el contador de remitos?')) {
        localStorage.removeItem('conteoUnidades');
        
        // Reiniciar contador de remitos
        contadorRemitos = 1;
        localStorage.setItem('contadorRemitos', contadorRemitos.toString());
        configurarNumeroRemito();
        
        console.log('✅ Conteo de unidades y contador de remitos limpiados');
        alert('Conteo de unidades y contador de remitos reiniciados correctamente.');
    }
}

// Mostrar resumen de ventas
function mostrarResumenVentas() {
    try {
        const conteo = obtenerConteoUnidades();
        const productosConVentas = Object.entries(conteo);
        
        if (productosConVentas.length === 0) {
            alert('No hay productos vendidos registrados.');
            return;
        }
        
        let resumen = `📊 RESUMEN DE VENTAS\n\n`;
        let totalUnidades = 0;
        let totalVendido = 0;
        
        productosConVentas.forEach(([productoId, datos]) => {
            resumen += `• ${datos.nombre}\n`;
            resumen += `  Vendidas: ${datos.cantidadTotal} unidades\n`;
            resumen += `  Total: $${formatearNumero(datos.cantidadTotal * datos.precioUnitario)}\n\n`;
            
            totalUnidades += datos.cantidadTotal;
            totalVendido += (datos.cantidadTotal * datos.precioUnitario);
        });
        
        resumen += `TOTALES:\n`;
        resumen += `Productos diferentes: ${productosConVentas.length}\n`;
        resumen += `Unidades vendidas: ${totalUnidades}\n`;
        resumen += `Monto total vendido: $${formatearNumero(totalVendido)}`;
        
        alert(resumen);
        
    } catch (error) {
        console.error('❌ Error al mostrar resumen:', error);
        mostrarError('Error al mostrar resumen: ' + error.message);
    }
}

// Función para cargar datos directamente desde JSON
async function cargarDatosDirectos() {
    
    // CLIENTES
    clientes = [
        {
            "id": "cli_009",
            "senor": "Jael Clerici",
            "domicilio": "Varela y Del campo",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_010",
            "senor": "David Trenque Lauquen",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_011",
            "senor": "Marcelo Weber",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_012",
            "senor": "Greta Rodríguez",
            "domicilio": "",
            "localidad": "Francisco Madero"
          },
          {
            "id": "cli_013",
            "senor": "Yingai",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_014",
            "senor": "Nico Weng",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_015",
            "senor": "Leticia Marechal",
            "domicilio": "Leticia Marechal 454",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_016",
            "senor": "Lela Lamanna",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_017",
            "senor": "Silva",
            "domicilio": "Orellana 477",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_018",
            "senor": "Nanci Sauco",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_019",
            "senor": "Jorgelina Moldovian",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_021",
            "senor": "Germán Arpigiani",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_022",
            "senor": "Fabiana Morales",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_023",
            "senor": "Zucari",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_024",
            "senor": "Patricia Bagato",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_025",
            "senor": "Jesi Delgado",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_026",
            "senor": "Mari Demichelis",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_027",
            "senor": "Martín Lobianco",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_028",
            "senor": "Juan Manuel",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_029",
            "senor": "Leal",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_030",
            "senor": "Marcelo Martínez",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_031",
            "senor": "Teresa Antonio",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_032",
            "senor": "Sol Pizarro",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_033",
            "senor": "Estela Supermercado",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_034",
            "senor": "Porcel",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_035",
            "senor": "Darío Crívaro",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_036",
            "senor": "El Arriero",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_037",
            "senor": "Vanesa Bonetti",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_038",
            "senor": "Marta Guado",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_039",
            "senor": "Ale Bellandi",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_040",
            "senor": "Marisa Lacerre",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_041",
            "senor": "Daniela Torchio",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_042",
            "senor": "Alberto Córdoba",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_043",
            "senor": "Viole Córdoba",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_044",
            "senor": "Romina",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_045",
            "senor": "Martina de Clemente Gran",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_046",
            "senor": "Marcela Salas",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_047",
            "senor": "Alegrini",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_048",
            "senor": "Paola Ascaray",
            "domicilio": "",
            "localidad": "Pehuajo"
          },
          {
            "id": "cli_049",
            "senor": "Cristian Gustavo Arena",
            "domicilio": "",
            "localidad": "Trenque Lauquen"
          },
          {
            "id": "cli_050",
            "senor": "Sofi La Familia",
            "domicilio": "",
            "localidad": "Pehuajo"
          }
      ,
      {
        "id": "cli_051",
        "senor": "Sabrina Medero",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_052",
        "senor": "Ale Godoy",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_053",
        "senor": "Marito Agrober",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_054",
        "senor": "Laura Rossi",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_055",
        "senor": "Luis Iturri",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_056",
        "senor": "Andrea Irrazábal",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_057",
        "senor": "Mariza Estrada",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_058",
        "senor": "Pedernera",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_059",
        "senor": "Córdoba",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_059",
        "senor": "Mariela Córdoba",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_060",
        "senor": "Leo de Súper Gutiérrez",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,  
      {
        "id": "cli_061",
        "senor": "Vicentenario",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_062",
        "senor": "Karina Asiático",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_062",
        "senor": "Karina Asiático",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_063",
        "senor": "Joaquín",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_064",
        "senor": "Elid Zamudio",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_065",
        "senor": "Cristian Serra",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_066",
        "senor": "Graciela Maggi",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_067",
        "senor": "Ignacio Segovia",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_068",
        "senor": "Fiambrería Gutiérrez",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_069",
        "senor": "Kenaipe",
        "domicilio": "Barrio Maradona",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_070",
        "senor": "Diego Tiano",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_071",
        "senor": "Amoroso",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_072",
        "senor": "Cunningham",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_073",
        "senor": "Quiroga",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_074",
        "senor": "Superchino",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_075",
        "senor": "Carla Denda",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_076",
        "senor": "Federico Gil",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_077",
        "senor": "Pablo Lolita",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_078",
        "senor": "Alejandra López",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_079",
        "senor": "Yani",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_080",
        "senor": "Vivi Denda",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_081",
        "senor": "Jonathan Shea",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
      ,
      {
        "id": "cli_082",
        "senor": "Miner",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_083",
        "senor": "Sandra Arias",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_084",
        "senor": "Santiago Verdulería",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_085",
        "senor": "Toto Bernal",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_086",
        "senor": "Turca",
        "domicilio": "",
        "localidad": "Pehuajo"
      }
      ,
      {
        "id": "cli_087",
        "senor": "Giacoya Hernán",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_088",
        "senor": "Agustín Esquivel",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_089",
        "senor": "Elena Superchino",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_090",
        "senor": "Mariela Vásquez",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_091",
        "senor": "Javier Peliza",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_092",
        "senor": "Gaby Quiroga",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_093",
        "senor": "Marcelo Chino",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_094",
        "senor": "Mary Sandy",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_095",
        "senor": "Luis Palomeque",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_096",
        "senor": "Sofia De Luis",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_097",
        "senor": "Loli",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_098",
        "senor": "Distribuidora Medina",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_099",
        "senor": "Alberto De Tofoli",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_100",
        "senor": "Yan Caballería",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_101",
        "senor": "Leandro La Rosarina",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_102",
        "senor": "Serri",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_103",
        "senor": "Victoria Nuevo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_104",
        "senor": "Panda",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_105",
        "senor": "Super Obligado",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_106",
        "senor": "Sandra Fiambrería Angelita",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_107",
        "senor": "Claudia Pablo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_108",
        "senor": "Sandra Tevez",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_109",
        "senor": "Gabriela Gauna",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_110",
        "senor": "Cristian Vaquero",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_111",
        "senor": "Amelia Betuar",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_112",
        "senor": "Javier Moro",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_113",
        "senor": "Claudia de Cambaceres",
        "domicilio": "Cambaceres 275",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_114",
        "senor": "Marcela Gutiérrez",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_115",
        "senor": "Luis Piedrabuena",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_116",
        "senor": "Martina",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_117",
        "senor": "Daniel",
        "domicilio": "",
        "localidad": "Carlos casares"
      },
      {
        "id": "cli_118",
        "senor": "Elsa Viñales",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_119",
        "senor": "Carlos Moser",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_120",
        "senor": "Dari",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_121",
        "senor": "Silvia Verdulería",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_122",
        "senor": "Vanessa Bucolo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_123",
        "senor": "Victoria Pérez",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_124",
        "senor": "Huang",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_125",
        "senor": "Lucho Hidalgo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_126",
        "senor": "Jorge Pacheco",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_127",
        "senor": "Eduardo Sar",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_128",
        "senor": "Perón 300",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_129",
        "senor": "Sabor Urbano",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_130",
        "senor": "Doriana",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_131",
        "senor": "Federico Picilini",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_132",
        "senor": "Rulo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_133",
        "senor": "Mariano Pasteu",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_134",
        "senor": "Marcelo Fiol",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_135",
        "senor": "Rocío Prieto",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_136",
        "senor": "Martín Adriel",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_137",
        "senor": "Ripamonti",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_138",
        "senor": "A. Ballesteros",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_139",
        "senor": "Florencia",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_140",
        "senor": "Gilarducci",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_141",
        "senor": "Laura Hidalgo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_142",
        "senor": "Pignanelli",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_143",
        "senor": "Majo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_144",
        "senor": "Rocío Vicino",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_145",
        "senor": "Marcelo Bravo",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_146",
        "senor": "Mario",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_147",
        "senor": "Mónica Mendoza",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_148",
        "senor": "Marcelo Del Arco",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_149",
        "senor": "Rubén Di Salvo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_150",
        "senor": "Ernesto Rojas",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_151",
        "senor": "Alonso Jorgelina",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      },
      {
        "id": "cli_152",
        "senor": "Marcelo Carrizo",
        "domicilio": "",
        "localidad": "Pehuajo"
      },
      {
        "id": "cli_153",
        "senor": "Elsa",
        "domicilio": "",
        "localidad": "Trenque Lauquen"
      }
    ];
    
    //PRODUCTOS
    productos = [
        {
            "id": "almendras_con_chocolate_80g",
            "nombre": "Almendras con Chocolate 80g",
            "descripcion": "Almendras bañadas en chocolate 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2320
          },
          {
            "id": "budin_marsala_170g_821",
            "nombre": "Budín Marsala 170g (821)",
            "descripcion": "Budín sabor Marsala 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 700
          },
          {
            "id": "confites_banderita_80g_824",
            "nombre": "Confites Banderita 80g (824)",
            "descripcion": "Confites Banderita 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 415
          },
          {
            "id": "del_valle_anana_fizz_720ml_852",
            "nombre": "Del Valle Ananá Fizz 720ml (852)",
            "descripcion": "Sidra Del Valle Ananá Fizz 720 ml",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2400
          },
          {
            "id": "del_valle_sidra_1900ml_851",
            "nombre": "Del Valle Sidra 1900ml (851)",
            "descripcion": "Sidra Del Valle clásica 1900 ml",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1900
          },
          {
            "id": "don_satur_budin_190g_267",
            "nombre": "Don Satur Budín 190g (267)",
            "descripcion": "Budín Don Satur 190 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1250
          },
          {
            "id": "don_satur_pan_dulce_con_chips_400g_819",
            "nombre": "Don Satur Pan Dulce con Chips 400g (819)",
            "descripcion": "Pan dulce Don Satur con chips de chocolate 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2850
          },
          {
            "id": "don_satur_pan_dulce_con_fruta_400g_818",
            "nombre": "Don Satur Pan Dulce con Fruta 400g (818)",
            "descripcion": "Pan dulce Don Satur con fruta 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2850
          },
          {
            "id": "don_satur_pan_dulce_sin_fruta_400g_820",
            "nombre": "Don Satur Pan Dulce sin Fruta 400g (820)",
            "descripcion": "Pan dulce Don Satur sin fruta 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2550
          },
          {
            "id": "garrapinadas_de_mani_200g_823",
            "nombre": "Garrapiñadas de Maní 200g (823)",
            "descripcion": "Garrapiñadas de maní 200 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "garrapinadas_de_mani_80g_822",
            "nombre": "Garrapiñadas de Maní 80g (822)",
            "descripcion": "Garrapiñadas de maní 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 310
          },
          {
            "id": "huesitos_de_chocolate_80g_831",
            "nombre": "Huesitos de Chocolate 80g (831)",
            "descripcion": "Huesitos de chocolate 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 420
          },
          {
            "id": "huesitos_frutales_color_80g_829",
            "nombre": "Huesitos Frutales Color 80g (829)",
            "descripcion": "Huesitos frutales coloridos 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 420
          },
          {
            "id": "mani_con_chocolate_80g_825",
            "nombre": "Maní con Chocolate 80g (825)",
            "descripcion": "Maní cubierto con chocolate 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 412
          },
          {
            "id": "mantecol_110g_850",
            "nombre": "Mantecol 110g (850)",
            "descripcion": "Mantecol barra 110 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "mantecol_253g_111",
            "nombre": "Mantecol 253g (111)",
            "descripcion": "Mantecol barra 253 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3650
          },
          {
            "id": "pasas_de_uva_con_chocolate_80g_837",
            "nombre": "Pasas de Uva con Chocolate 80g (837)",
            "descripcion": "Pasas de uva bañadas en chocolate 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1530
          },
          {
            "id": "pozo_budin_170g",
            "nombre": "Pozo Budín 170g",
            "descripcion": "Budín Pozo 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "prostres_de_mani_lheritier_100g_110",
            "nombre": "Postre de Maní Lheritier 100g (110)",
            "descripcion": "Postre de maní Lheritier 100 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 700
          },
          {
            "id": "turron_crocante_de_mani_100g_839",
            "nombre": "Turrón Crocante de Maní 100g (839)",
            "descripcion": "Turrón crocante de maní 100 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 970
          },
          {
            "id": "turron_de_mani_80g_840",
            "nombre": "Turrón de Maní 80g (840)",
            "descripcion": "Turrón clásico de maní 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 568
          },
          {
            "id": "turron_de_mani_con_frutas_120g_841",
            "nombre": "Turrón de Maní con Frutas 120g (841)",
            "descripcion": "Turrón de maní con frutas 120 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1160
          },
          {
            "id": "valente_budin_170g_814",
            "nombre": "Valente Budín 170g (814)",
            "descripcion": "Budín Valente 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1390
          },
          {
            "id": "valente_pan_dulce_con_chips_400g_817",
            "nombre": "Valente Pan Dulce con Chips 400g (817)",
            "descripcion": "Pan dulce Valente con chips de chocolate 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3500
          },
          {
            "id": "valente_pan_dulce_con_frutas_400g_815",
            "nombre": "Valente Pan Dulce con Frutas 400g (815)",
            "descripcion": "Pan dulce Valente con frutas 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3180
          },
          {
            "id": "valente_pan_dulce_sin_frutas_350g_816",
            "nombre": "Valente Pan Dulce sin Frutas 350g (816)",
            "descripcion": "Pan dulce Valente sin frutas 350 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "bon_o_bon_30u_blanco_100_1",
            "nombre": "Bon o Bon 30u Blanco (100-1)",
            "descripcion": "Caja Bon o Bon blanco 30 unidades",
            "unidades_por_bulto": 30,
            "descripcion_bulto": "1 bulto = 30 unidades",
            "precio_bulto": 9900
          },
          {
            "id": "alfajor_fantoche_triple_blanco_o_negro_115",
            "nombre": "Alfajor Fantoche Triple Blanco o Negro (115)",
            "descripcion": "Alfajor Fantoche triple, blanco o negro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 580
          },
          {
            "id": "alfajor_guaymallen_simple_blanco_o_negro_114",
            "nombre": "Alfajor Guaymallén Simple Blanco o Negro (114)",
            "descripcion": "Alfajor Guaymallén simple, blanco o negro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 200
          },
          {
            "id": "alfajor_guaymallen_triple_blanco_o_negro_118",
            "nombre": "Alfajor Guaymallén Triple Blanco o Negro (118)",
            "descripcion": "Alfajor Guaymallén triple, blanco o negro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 320
          },
          {
            "id": "caramelos_masticables_billiken_frutales_600g_108",
            "nombre": "Caramelos Masticables Billiken Frutales 600g (108)",
            "descripcion": "Caramelos masticables Billiken sabor frutales 600 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3000
          },
          {
            "id": "caramelos_masticables_billiken_yogurt_600g_108_1",
            "nombre": "Caramelos Masticables Billiken Yogurt 600g (108-1)",
            "descripcion": "Caramelos masticables Billiken sabor yogurt 600 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3000
          },
          {
            "id": "caramelos_masticables_misky_800g_104",
            "nombre": "Caramelos Masticables Misky 800g (104)",
            "descripcion": "Caramelos masticables Misky 800 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 4080
          },
          {
            "id": "chocolate_cofler_air_100g_117",
            "nombre": "Chocolate Cofler Air 100g (117)",
            "descripcion": "Chocolate Cofler Air 100 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3400
          },
          {
            "id": "chocolate_cofler_air_55g_116",
            "nombre": "Chocolate Cofler Air 55g (116)",
            "descripcion": "Chocolate Cofler Air 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2100
          },
          {
            "id": "chocolate_daqui_leche_y_mani_70g_98",
            "nombre": "Chocolate Daqui Leche y Maní 70g (98)",
            "descripcion": "Chocolate Daqui con leche y maní 70 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "chocolate_felfort_dos_corazones_96",
            "nombre": "Chocolate Felfort Dos Corazones (96)",
            "descripcion": "Chocolate Felfort Dos Corazones",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1040
          },
          {
            "id": "chocolate_felfort_marroc_97",
            "nombre": "Chocolate Felfort Marroc (97)",
            "descripcion": "Chocolate Felfort Marroc clásico",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "chocolate_felfort_paraguitas_105",
            "nombre": "Chocolate Felfort Paragüitas (105)",
            "descripcion": "Chocolate Felfort Paragüitas",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 615
          },
          {
            "id": "chocolate_hamlet_varios_sabores_43g_113",
            "nombre": "Chocolate Hamlet Varios Sabores 43g (113)",
            "descripcion": "Chocolate Hamlet 43 gramos, varios sabores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 420
          },
          {
            "id": "chocolate_rocklets_arcor_40g_103",
            "nombre": "Chocolate Rocklets Arcor 40g (103)",
            "descripcion": "Chocolate Rocklets Arcor 40 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 870
          },
          {
            "id": "chupetines_pico_dulce_48u_95",
            "nombre": "Chupetines Pico Dulce 48u (95)",
            "descripcion": "Chupetines Pico Dulce caja 48 unidades",
            "unidades_por_bulto": 48,
            "descripcion_bulto": "1 bulto = 48 unidades",
            "precio_bulto": 6960
          },
          {
            "id": "gongys_malvaviscos_trenzas_nubecitas_palitos_119",
            "nombre": "Gongys Malvaviscos Trenzas / Nubecitas / Palitos (119)",
            "descripcion": "Gongys malvaviscos trenzas, nubecitas o palitos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1800
          },
          {
            "id": "pastillas_biyu_tutti_frutti_102",
            "nombre": "Pastillas Biyu Tutti Frutti (102)",
            "descripcion": "Pastillas Biyu sabor tutti frutti",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 790
          },
          {
            "id": "pastillas_menthoplus_strong_o_mentol_107",
            "nombre": "Pastillas Menthoplus Strong o Mentol (107)",
            "descripcion": "Pastillas Menthoplus sabor strong o mentol",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 340
          },
          {
            "id": "turron_misky_109",
            "nombre": "Turrón Misky (109)",
            "descripcion": "Turrón Misky clásico",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "aceituna_don_nicanor_verdes_con_carozo_170g_120",
            "nombre": "Aceituna Don Nicanor Verdes con Carozo 170g (120)",
            "descripcion": "Aceitunas verdes con carozo Don Nicanor 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "aceituna_don_nicanor_verdes_con_carozo_90g_121",
            "nombre": "Aceituna Don Nicanor Verdes con Carozo 90g (121)",
            "descripcion": "Aceitunas verdes con carozo Don Nicanor 90 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "jugos_arcor_140",
            "nombre": "Jugos Arcor (140)",
            "descripcion": "Jugos Arcor varios sabores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 260
          },
          {
            "id": "jugos_tang_141",
            "nombre": "Jugos Tang (141)",
            "descripcion": "Jugos Tang varios sabores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 260
          },
          {
            "id": "levadura_levex_20g_122",
            "nombre": "Levadura Levex 20g (122)",
            "descripcion": "Levadura Levex 20 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 660
          },
          {
            "id": "maicitos_pehuamar_265g_123",
            "nombre": "Maicitos Pehuamar 265g (123)",
            "descripcion": "Maicitos Pehuamar 265 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3400
          },
          {
            "id": "snack_krachitos_bastoncitos_ketchup_137_1",
            "nombre": "Snack Krachitos Bastoncitos Ketchup (137-1)",
            "descripcion": "Snack Krachitos bastoncitos sabor ketchup",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "snack_krachitos_bastonitos_137",
            "nombre": "Snack Krachitos Bastonitos (137)",
            "descripcion": "Snack Krachitos bastonitos clásicos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "snack_krachitos_chizitos_138",
            "nombre": "Snack Krachitos Chizitos (138)",
            "descripcion": "Snack Krachitos chizitos sabor queso",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "snack_krachitos_konos_barbacoa_134",
            "nombre": "Snack Krachitos Konos Barbacoa (134)",
            "descripcion": "Snack Krachitos konos sabor barbacoa",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 790
          },
          {
            "id": "snack_krachitos_konos_hot_135",
            "nombre": "Snack Krachitos Konos Hot (135)",
            "descripcion": "Snack Krachitos konos sabor picante hot",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 790
          },
          {
            "id": "snack_krachitos_mani_salado_133",
            "nombre": "Snack Krachitos Maní Salado (133)",
            "descripcion": "Snack Krachitos maní salado",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1620
          },
          {
            "id": "snack_krachitos_palitos_salados_132",
            "nombre": "Snack Krachitos Palitos Salados (132)",
            "descripcion": "Snack Krachitos palitos salados",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "snack_krachitos_superconos_136",
            "nombre": "Snack Krachitos Superconos (136)",
            "descripcion": "Snack Krachitos superconos sabor queso",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 890
          },
          {
            "id": "snack_krachitos_papas_fritas_americano_50g_125",
            "nombre": "Snack Krachitos Papas Fritas Americano 50g (125)",
            "descripcion": "Snack Krachitos papas fritas sabor americano 50 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1050
          },
          {
            "id": "snack_krachitos_papas_fritas_cheddar_55g_131",
            "nombre": "Snack Krachitos Papas Fritas Cheddar 55g (131)",
            "descripcion": "Snack Krachitos papas fritas sabor cheddar 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 920
          },
          {
            "id": "snack_krachitos_papas_fritas_hot_50g_714",
            "nombre": "Snack Krachitos Papas Fritas Hot 50g (714)",
            "descripcion": "Snack Krachitos papas fritas sabor hot picante 50 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 890
          },
          {
            "id": "snack_krachitos_papas_fritas_jamon_55g_126",
            "nombre": "Snack Krachitos Papas Fritas Jamón 55g (126)",
            "descripcion": "Snack Krachitos papas fritas sabor jamón 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "snack_krachitos_papas_fritas_ketchup_55g",
            "nombre": "Snack Krachitos Papas Fritas Ketchup 55g",
            "descripcion": "Snack Krachitos papas fritas sabor ketchup 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 920
          },
          {
            "id": "snack_krachitos_papas_fritas_pay_55g_128",
            "nombre": "Snack Krachitos Papas Fritas Pay 55g (128)",
            "descripcion": "Snack Krachitos papas fritas tipo pay 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 890
          },
          {
            "id": "snack_krachitos_papas_fritas_tradicional_105g_713",
            "nombre": "Snack Krachitos Papas Fritas Tradicional 105g (713)",
            "descripcion": "Snack Krachitos papas fritas sabor tradicional 105 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1450
          },
          {
            "id": "snack_krachitos_papas_fritas_tradicional_55g_129",
            "nombre": "Snack Krachitos Papas Fritas Tradicional 55g (129)",
            "descripcion": "Snack Krachitos papas fritas sabor tradicional 55 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1050
          },
          {
            "id": "arvejas_marolio_tetra_pack_340g_200",
            "nombre": "Arvejas Marolio 340g Tetra Pack (200)",
            "descripcion": "Arvejas Marolio 340 gramos en envase Tetra Pack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 380
          },
          {
            "id": "arvejas_molto_tetra_pack_340g_201",
            "nombre": "Arvejas Molto 340g Tetra Pack (201)",
            "descripcion": "Arvejas Molto 340 gramos en Tetra Pack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 515
          },
          {
            "id": "atun_la_banda_desmenuzado_170g_202",
            "nombre": "Atún La Banda Desmenuzado 170g (202)",
            "descripcion": "Atún La Banda desmenuzado 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "choclo_amarillo_en_grano_marolio_lata_300g_203",
            "nombre": "Choclo Amarillo en Grano Marolio Lata 300g (203)",
            "descripcion": "Choclo amarillo en grano Marolio en lata 300 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 950
          },
          {
            "id": "choclo_amarillo_en_grano_okey_lata_300g_219",
            "nombre": "Choclo Amarillo en Grano Okey Lata 300g (219)",
            "descripcion": "Choclo amarillo en grano Okey en lata 300 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 850
          },
          {
            "id": "tomate_perita_molto_lata_400g_221",
            "nombre": "Tomate Perita Molto Lata 400g (221)",
            "descripcion": "Tomate perita Molto en lata 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "duraznos_marolio_en_mitades_820g_206",
            "nombre": "Duraznos Marolio en Mitades 820g (206)",
            "descripcion": "Duraznos Marolio en mitades 820 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1300
          },
          {
            "id": "palmitos_fruta_de_oro_trozos_400g_209",
            "nombre": "Palmitos Fruta de Oro Trozos 400g (209)",
            "descripcion": "Palmitos Fruta de Oro en trozos 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "palmitos_fruta_de_oro_rodajas_400g_209_1",
            "nombre": "Palmitos Fruta de Oro Rodajas 400g (209-1)",
            "descripcion": "Palmitos Fruta de Oro en rodajas 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "picadillo_marolio_90g_211_1",
            "nombre": "Picadillo Marolio 90g (211-1)",
            "descripcion": "Picadillo Marolio 90 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "pate_marolio_90g_211",
            "nombre": "Paté Marolio 90g (211)",
            "descripcion": "Paté Marolio 90 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "pimiento_morron_nogal_dorado_285g_212",
            "nombre": "Pimiento Morrón Nogal Dorado 285g (212)",
            "descripcion": "Pimiento morrón Nogal Dorado 285 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "pure_de_papas_knorr_125g_213",
            "nombre": "Puré de Papas Knorr 125g (213)",
            "descripcion": "Puré de papas Knorr 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1550
          },
          {
            "id": "pure_de_papas_maggi_125g_215",
            "nombre": "Puré de Papas Maggi 125g (215)",
            "descripcion": "Puré de papas Maggi 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "pure_de_tomate_okey_520g_216",
            "nombre": "Puré de Tomate Okey 520g (216)",
            "descripcion": "Puré de tomate Okey 520 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 480
          },
          {
            "id": "pure_de_tomate_marolio_200g_721",
            "nombre": "Puré de Tomate Marolio 200g (721)",
            "descripcion": "Puré de tomate Marolio 200 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 250
          },
          {
            "id": "tomate_perita_alco_lata_400g_218",
            "nombre": "Tomate Perita Alco Lata 400g (218)",
            "descripcion": "Tomate perita Alco en lata 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 680
          },
          {
            "id": "tomate_perita_marolio_lata_400g_214",
            "nombre": "Tomate Perita Marolio Lata 400g (214)",
            "descripcion": "Tomate perita Marolio en lata 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 730
          },
          {
            "id": "duraznos_marolio_tetra_pack_340g_220",
            "nombre": "Duraznos Marolio 340g Tetra Pack (220)",
            "descripcion": "Duraznos Marolio 340 gramos en Tetra Pack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "tomate_triturado_camino_980ml_217",
            "nombre": "Tomate Triturado Camino 980ml (217)",
            "descripcion": "Tomate triturado Camino 980 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1290
          },
          {
            "id": "azucar_marolio_1kg",
            "nombre": "Azúcar Marolio 1kg",
            "descripcion": "Azúcar común marca Marolio 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "cacao_nesquik_180g_302",
            "nombre": "Cacao Nesquik 180g (302)",
            "descripcion": "Cacao en polvo Nesquik 180 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "cafe_la_morenita_torrado_molido_intenso_125g_912",
            "nombre": "Café La Morenita Torrado Molido Intenso 125g (912)",
            "descripcion": "Café La Morenita torrado molido intenso 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "cafe_la_virginia_torrado_molido_125g_910",
            "nombre": "Café La Virginia Torrado Molido 125g (910)",
            "descripcion": "Café La Virginia torrado molido 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "cafe_la_virginia_torrado_molido_250g_911",
            "nombre": "Café La Virginia Torrado Molido 250g (911)",
            "descripcion": "Café La Virginia torrado molido 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3100
          },
          {
            "id": "cafe_nescafe_dolca_tradicional_100g_303",
            "nombre": "Café Nescafé Dolca Tradicional 100g (303)",
            "descripcion": "Café instantáneo Nescafé Dolca tradicional 100 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3800
          },
          {
            "id": "cafe_nescafe_dolca_caramel_125g_dp_914",
            "nombre": "Café Nescafé Dolca Caramel 125g D.P (914)",
            "descripcion": "Café Nescafé Dolca sabor caramel 125 gramos Doypack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1900
          },
          {
            "id": "cafe_nescafe_dolca_latte_125g_dp_913",
            "nombre": "Café Nescafé Dolca Latte 125g D.P (913)",
            "descripcion": "Café Nescafé Dolca sabor latte 125 gramos Doypack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1900
          },
          {
            "id": "cafe_nescafe_dolca_tradicional_o_suave_170g_304",
            "nombre": "Café Nescafé Dolca Tradicional o Suave 170g (304)",
            "descripcion": "Café instantáneo Nescafé Dolca tradicional o suave 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5500
          },
          {
            "id": "hileret_azucar_light_250g_305",
            "nombre": "Hileret Azúcar Light 250g (305)",
            "descripcion": "Endulzante Hileret azúcar light 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 920
          },
          {
            "id": "malta_el_pocillo_115g_dp_334",
            "nombre": "Malta El Pocillo 115g D.P (334)",
            "descripcion": "Malta El Pocillo 115 gramos en doypack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1600
          },
          {
            "id": "malta_el_pocillo_pote_170g_308",
            "nombre": "Malta El Pocillo Pote 170g (308)",
            "descripcion": "Malta El Pocillo 170 gramos en pote",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2250
          },
          {
            "id": "mate_cocido_la_tranquera_25_saquitos_309",
            "nombre": "Mate Cocido La Tranquera 25 Saquitos (309)",
            "descripcion": "Mate cocido La Tranquera caja de 25 saquitos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "mate_cocido_la_tranquera_50_saquitos_310",
            "nombre": "Mate Cocido La Tranquera 50 Saquitos (310)",
            "descripcion": "Mate cocido La Tranquera caja de 50 saquitos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1450
          },
          {
            "id": "te_la_virginia_25_saquitos_311",
            "nombre": "Té La Virginia 25 Saquitos (311)",
            "descripcion": "Té La Virginia caja de 25 saquitos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "te_marolio_25_saquitos_312",
            "nombre": "Té Marolio 25 Saquitos (312)",
            "descripcion": "Té Marolio caja de 25 saquitos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 480
          },
          {
            "id": "yerba_amanda_1kg_313",
            "nombre": "Yerba Amanda 1kg (313)",
            "descripcion": "Yerba mate Amanda paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2900
          },
          {
            "id": "yerba_amanda_500g_314",
            "nombre": "Yerba Amanda 500g (314)",
            "descripcion": "Yerba mate Amanda paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1450
          },
          {
            "id": "yerba_andresito_1kg_315",
            "nombre": "Yerba Andresito 1kg (315)",
            "descripcion": "Yerba mate Andresito paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2475
          },
          {
            "id": "yerba_andresito_2kg_316",
            "nombre": "Yerba Andresito 2kg (316)",
            "descripcion": "Yerba mate Andresito paquete de 2 kilogramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5000
          },
          {
            "id": "yerba_andresito_500g_317",
            "nombre": "Yerba Andresito 500g (317)",
            "descripcion": "Yerba mate Andresito paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1260
          },
          {
            "id": "yerba_cachamate_1kg_amarillo_rosa",
            "nombre": "Yerba Cachamate 1kg Amarillo/Rosa",
            "descripcion": "Yerba mate Cachamate 1 kilogramo, variedades amarillo o rosa",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2400
          },
          {
            "id": "yerba_cachamate_500g_amarillo_rosa_319",
            "nombre": "Yerba Cachamate 500g Amarillo/Rosa (319)",
            "descripcion": "Yerba mate Cachamate 500 gramos, variedades amarillo o rosa",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "yerba_la_tranquera_1kg_comun_o_suave_335",
            "nombre": "Yerba La Tranquera 1kg Común/Suave (335)",
            "descripcion": "Yerba mate La Tranquera 1 kilogramo, común o suave",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2600
          },
          {
            "id": "yerba_la_tranquera_1kg_liviana_321",
            "nombre": "Yerba La Tranquera 1kg Liviana (321)",
            "descripcion": "Yerba mate La Tranquera 1 kilogramo liviana",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2300
          },
          {
            "id": "yerba_la_tranquera_500g_comun_o_suave_322",
            "nombre": "Yerba La Tranquera 500g Común/Suave (322)",
            "descripcion": "Yerba mate La Tranquera 500 gramos, común o suave",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1350
          },
          {
            "id": "yerba_la_tranquera_500g_liviana_323",
            "nombre": "Yerba La Tranquera 500g Liviana (323)",
            "descripcion": "Yerba mate La Tranquera 500 gramos liviana",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "yerba_mananita_1kg_324",
            "nombre": "Yerba Mañanita 1kg (324)",
            "descripcion": "Yerba mate Mañanita paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3200
          },
          {
            "id": "yerba_mananita_500g_325",
            "nombre": "Yerba Mañanita 500g (325)",
            "descripcion": "Yerba mate Mañanita paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "yerba_marolio_500g_con_palo_326",
            "nombre": "Yerba Marolio 500g con Palo (326)",
            "descripcion": "Yerba mate Marolio con palo 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1250
          },
          {
            "id": "yerba_playadito_1kg_327",
            "nombre": "Yerba Playadito 1kg (327)",
            "descripcion": "Yerba mate Playadito paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3300
          },
          {
            "id": "yerba_playadito_500g_328",
            "nombre": "Yerba Playadito 500g (328)",
            "descripcion": "Yerba mate Playadito paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1700
          },
          {
            "id": "yerba_rosamonte_1kg_comun_o_suave_329",
            "nombre": "Yerba Rosamonte 1kg Común/Suave (329)",
            "descripcion": "Yerba mate Rosamonte 1 kilogramo, común o suave",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2700
          },
          {
            "id": "yerba_rosamonte_1kg_especial_suave_337",
            "nombre": "Yerba Rosamonte 1kg Especial/Suave (337)",
            "descripcion": "Yerba mate Rosamonte especial o suave 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3000
          },
          {
            "id": "yerba_rosamonte_500g_comun_o_suave_330",
            "nombre": "Yerba Rosamonte 500g Común/Suave (330)",
            "descripcion": "Yerba mate Rosamonte 500 gramos, común o suave",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1320
          },
          {
            "id": "yerba_taragui_1kg_331",
            "nombre": "Yerba Taragüi 1kg (331)",
            "descripcion": "Yerba mate Taragüi paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3300
          },
          {
            "id": "yerba_taragui_500g_332",
            "nombre": "Yerba Taragüi 500g (332)",
            "descripcion": "Yerba mate Taragüi paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "yerba_union_500g_333",
            "nombre": "Yerba Unión 500g (333)",
            "descripcion": "Yerba mate Unión paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "dulce_de_leche_el_quebrachal_400g",
            "nombre": "Dulce de Leche El Quebrachal 400g",
            "descripcion": "Dulce de leche El Quebrachal pote de 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1190
          },
          {
            "id": "exquisita_flan_vainilla_o_dulce_de_leche_251",
            "nombre": "Exquisita Flan Vainilla/Dulce de Leche (251)",
            "descripcion": "Preparado Exquisita para flan sabor vainilla o dulce de leche",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 590
          },
          {
            "id": "exquisita_postres_296",
            "nombre": "Exquisita Postres (296)",
            "descripcion": "Preparado para postres Exquisita varios sabores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 860
          },
          {
            "id": "galletitas_9_de_oro_clasica_o_azucarada_254",
            "nombre": "Galletitas 9 de Oro Clásica/Azucarada (254)",
            "descripcion": "Galletitas 9 de Oro clásicas o azucaradas",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "galletitas_cerealitas_212g_810",
            "nombre": "Galletitas Cerealitas 212g (810)",
            "descripcion": "Galletitas Cerealitas 212 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "galletitas_class_pepas_500g_256",
            "nombre": "Galletitas Class Pepas 500g (256)",
            "descripcion": "Galletitas Class pepas 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 925
          },
          {
            "id": "galletitas_fachita_mini_tapas_400g_257",
            "nombre": "Galletitas Fachita Mini Tapas 400g (257)",
            "descripcion": "Galletitas Fachita mini tapas para alfajores 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1850
          },
          {
            "id": "galletitas_gold_mundo_pepitas_500g_804",
            "nombre": "Galletitas Gold Mundo Pepitas 500g (804)",
            "descripcion": "Galletitas Gold Mundo pepitas 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "galletitas_kokis_canoncitos_500g_259",
            "nombre": "Galletitas Kokis Cañoncitos 500g (259)",
            "descripcion": "Galletitas Kokis cañoncitos rellenos 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1725
          },
          {
            "id": "galletitas_leiva_tostadas_arroz_150g_261",
            "nombre": "Galletitas Leiva Tostadas de Arroz 150g (261)",
            "descripcion": "Tostadas de arroz Leiva 150 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "galletitas_madalenas_pozo_250g_varios_sabores_262",
            "nombre": "Galletitas Madalenas Pozo 250g Varios Sabores (262)",
            "descripcion": "Madalenas Pozo varios sabores 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "galletitas_mafalda_hojaldre_150g_263",
            "nombre": "Galletitas Mafalda Hojaldre 150g (263)",
            "descripcion": "Galletitas Mafalda hojaldradas 150 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 650
          },
          {
            "id": "galletitas_manieri_tostadas_200g_264",
            "nombre": "Galletitas Manieri Tostadas 200g (264)",
            "descripcion": "Tostadas Manieri 200 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 710
          },
          {
            "id": "galletitas_manolito_250g_850",
            "nombre": "Galletitas Manolito 250g (850)",
            "descripcion": "Galletitas Manolito 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 470
          },
          {
            "id": "galletitas_mauri_fauna_surtidas_400g_266",
            "nombre": "Galletitas Mauri Fauna Surtidas 400g (266)",
            "descripcion": "Galletitas surtidas Mauri Fauna 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "galletitas_media_tarde_tripack_852",
            "nombre": "Galletitas Media Tarde Tripack (852)",
            "descripcion": "Galletitas Media Tarde tripack surtido",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "galletitas_mini_coronitas_140g_268",
            "nombre": "Galletitas Mini Coronitas 140g (268)",
            "descripcion": "Galletitas Mini Coronitas 140 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 770
          },
          {
            "id": "galletitas_mini_mafalda_150g_269",
            "nombre": "Galletitas Mini Mafalda 150g (269)",
            "descripcion": "Galletitas Mini Mafalda 150 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 450
          },
          {
            "id": "galletitas_neosol_dulces_360g_291",
            "nombre": "Galletitas Neosol Dulces 360g (291)",
            "descripcion": "Galletitas Neosol dulces 360 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 810
          },
          {
            "id": "galletitas_neosol_mini_5_semillas_250g_292",
            "nombre": "Galletitas Neosol Mini 5 Semillas 250g (292)",
            "descripcion": "Galletitas Neosol mini con 5 semillas 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "galletitas_neosol_mini_salvado_250g_293",
            "nombre": "Galletitas Neosol Mini Salvado 250g (293)",
            "descripcion": "Galletitas Neosol mini sabor salvado 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 550
          },
          {
            "id": "galletitas_neosol_mini_sandwich_250g_294",
            "nombre": "Galletitas Neosol Mini Sándwich 250g (294)",
            "descripcion": "Galletitas Neosol mini tipo sándwich 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 480
          },
          {
            "id": "galletitas_neosol_salvado_360g_290",
            "nombre": "Galletitas Neosol Salvado 360g (290)",
            "descripcion": "Galletitas Neosol sabor salvado 360 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 700
          },
          {
            "id": "galletitas_neosol_sandwich_330g_289",
            "nombre": "Galletitas Neosol Sándwich 330g (289)",
            "descripcion": "Galletitas Neosol tipo sándwich 330 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "galletitas_obleas_recital_100g_271",
            "nombre": "Galletitas Obleas Recital 100g (271)",
            "descripcion": "Obleas Recital 100 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "galletitas_okebon_leche_273g_272",
            "nombre": "Galletitas Okebon Leche 273g (272)",
            "descripcion": "Galletitas Okebon sabor leche 273 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "galletitas_oreo_tripack_273",
            "nombre": "Galletitas Oreo Tripack (273)",
            "descripcion": "Galletitas Oreo tripack original",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "galletitas_oreo_118g_274",
            "nombre": "Galletitas Oreo 118g (274)",
            "descripcion": "Galletitas Oreo paquete 118 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "galletitas_paseo_mini_crakers_300g_crakers_275",
            "nombre": "Galletitas Paseo Mini Crakers 300g Crakers (275)",
            "descripcion": "Galletitas Paseo mini crakers 300 gramos sabor clásico",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 825
          },
          {
            "id": "galletitas_paseo_mini_crakers_300g_sin_sal_276",
            "nombre": "Galletitas Paseo Mini Crakers 300g Sin Sal (276)",
            "descripcion": "Galletitas Paseo mini crakers sin sal 300 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 825
          },
          {
            "id": "galletitas_paseo_mini_crakers_300g_5_semillas_277",
            "nombre": "Galletitas Paseo Mini Crakers 300g 5 Semillas (277)",
            "descripcion": "Galletitas Paseo mini crakers 5 semillas 300 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 995
          },
          {
            "id": "galletitas_paseo_mini_crakers_300g_salvado_278",
            "nombre": "Galletitas Paseo Mini Crakers 300g Salvado (278)",
            "descripcion": "Galletitas Paseo mini crakers sabor salvado 300 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 995
          },
          {
            "id": "galletitas_pepos_pepas_500g_298",
            "nombre": "Galletitas Pepos Pepas 500g (298)",
            "descripcion": "Galletitas Pepos pepas 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "galletitas_pitusas_160g",
            "nombre": "Galletitas Pitusas 160g",
            "descripcion": "Galletitas Pitusas rellenas 160 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 730
          },
          {
            "id": "galletitas_riera_tostadas_clasicas_280",
            "nombre": "Galletitas Riera Tostadas Clásicas (280)",
            "descripcion": "Tostadas Riera clásicas 280 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 910
          },
          {
            "id": "galletitas_saladix_varios_sabores_100g_281",
            "nombre": "Galletitas Saladix Varios Sabores 100g (281)",
            "descripcion": "Galletitas Saladix 100 gramos, varios sabores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1100
          },
          {
            "id": "galletitas_solitas_sin_sal_500g_243",
            "nombre": "Galletitas Solitas Sin Sal 500g (243)",
            "descripcion": "Galletitas Solitas sin sal 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "galletitas_solitas_animacion_400g_282",
            "nombre": "Galletitas Solitas Animación 400g (282)",
            "descripcion": "Galletitas Solitas Animación 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1120
          },
          {
            "id": "galletitas_solitas_frutilla_aritos_pensamientos_chirolas_500g_283",
            "nombre": "Galletitas Solitas Frutilla/Aritos/Pensamientos/Chirolas 500g (283)",
            "descripcion": "Galletitas Solitas surtidas de frutilla, aritos, pensamientos o chirolas 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1250
          },
          {
            "id": "galletitas_surtido_terrabusi_variedad_400g_852",
            "nombre": "Galletitas Surtido Terrabusi Variedad 400g (852)",
            "descripcion": "Galletitas surtido Terrabusi variedad 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1700
          },
          {
            "id": "galletitas_talitas_urquiza_851",
            "nombre": "Galletitas Talitas Urquiza (851)",
            "descripcion": "Galletitas saladas Talitas Urquiza",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "galletitas_terrabusi_boca_de_dama_170g_812",
            "nombre": "Galletitas Terrabusi Boca de Dama 170g (812)",
            "descripcion": "Galletitas Terrabusi Boca de Dama 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 630
          },
          {
            "id": "galletitas_terrabusi_scons_170g_813",
            "nombre": "Galletitas Terrabusi Scons 170g (813)",
            "descripcion": "Galletitas Terrabusi scons 170 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 630
          },
          {
            "id": "galletitas_toddy_original_126g_811",
            "nombre": "Galletitas Toddy Original 126g (811)",
            "descripcion": "Galletitas Toddy sabor original 126 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1050
          },
          {
            "id": "galletitas_vainillas_mauri_320g_285",
            "nombre": "Galletitas Vainillas Mauri 320g (285)",
            "descripcion": "Galletitas Vainillas Mauri 320 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "galletitas_vainillas_mauri_80g_286",
            "nombre": "Galletitas Vainillas Mauri 80g (286)",
            "descripcion": "Galletitas Vainillas Mauri 80 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 350
          },
          {
            "id": "galletitas_vainillas_pozo_444g_287",
            "nombre": "Galletitas Vainillas Pozo 444g (287)",
            "descripcion": "Galletitas Vainillas Pozo 444 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2250
          },
          {
            "id": "mermelada_noel_vidrio_dur_dam_cir_nar_454g_288",
            "nombre": "Mermelada Noel Durazno/Damasco/Ciruela/Naranja 454g Vidrio (288)",
            "descripcion": "Mermelada Noel en frasco de vidrio 454 gramos, sabores durazno, damasco, ciruela o naranja",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "mermelada_noel_frutilla_vidrio_454g_288_1",
            "nombre": "Mermelada Noel Frutilla 454g Vidrio (288-1)",
            "descripcion": "Mermelada Noel sabor frutilla en frasco de vidrio 454 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1880
          },
          {
            "id": "royal_gelatina_frutilla_o_naranja_299",
            "nombre": "Royal Gelatina Frutilla/Naranja (299)",
            "descripcion": "Gelatina Royal sabor frutilla o naranja",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "aceite_canuelas_1_5l_girasol",
            "nombre": "Aceite Cañuelas 1.5L Girasol",
            "descripcion": "Aceite de girasol Cañuelas 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3700
          },
          {
            "id": "aceite_canuelas_900ml_girasol_351",
            "nombre": "Aceite Cañuelas 900ml Girasol (351)",
            "descripcion": "Aceite de girasol Cañuelas 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2400
          },
          {
            "id": "aceite_cocinero_1_5l_girasol_352",
            "nombre": "Aceite Cocinero 1.5L Girasol (352)",
            "descripcion": "Aceite de girasol Cocinero 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3500
          },
          {
            "id": "aceite_cocinero_1_5l_mezcla_353",
            "nombre": "Aceite Cocinero 1.5L Mezcla (353)",
            "descripcion": "Aceite mezcla Cocinero 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3000
          },
          {
            "id": "aceite_cocinero_900ml_mezcla_354",
            "nombre": "Aceite Cocinero 900ml Mezcla (354)",
            "descripcion": "Aceite mezcla Cocinero 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2100
          },
          {
            "id": "aceite_cocinero_900ml_girasol_355",
            "nombre": "Aceite Cocinero 900ml Girasol (355)",
            "descripcion": "Aceite de girasol Cocinero 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2400
          },
          {
            "id": "aceite_leira_4_5l_girasol_356",
            "nombre": "Aceite Leira 4.5L Girasol (356)",
            "descripcion": "Aceite de girasol Leira 4.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 7900
          },
          {
            "id": "aceite_leira_900ml_girasol_357",
            "nombre": "Aceite Leira 900ml Girasol (357)",
            "descripcion": "Aceite de girasol Leira 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1850
          },
          {
            "id": "aceite_marolio_900ml_girasol_359",
            "nombre": "Aceite Marolio 900ml Girasol (359)",
            "descripcion": "Aceite de girasol Marolio 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2100
          },
          {
            "id": "aceite_marolio_900ml_mezcla_360",
            "nombre": "Aceite Marolio 900ml Mezcla (360)",
            "descripcion": "Aceite mezcla Marolio 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1800
          },
          {
            "id": "aceite_natura_1_5l_girasol_361",
            "nombre": "Aceite Natura 1.5L Girasol (361)",
            "descripcion": "Aceite de girasol Natura 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3900
          },
          {
            "id": "aceite_natura_3l_girasol_362",
            "nombre": "Aceite Natura 3L Girasol (362)",
            "descripcion": "Aceite de girasol Natura 3 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 8000
          },
          {
            "id": "aceite_natura_900ml_girasol_363",
            "nombre": "Aceite Natura 900ml Girasol (363)",
            "descripcion": "Aceite de girasol Natura 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2550
          },
          {
            "id": "aceite_okey_900ml_mezcla_364",
            "nombre": "Aceite Okey 900ml Mezcla (364)",
            "descripcion": "Aceite mezcla Okey 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1790
          },
          {
            "id": "grasa_esani_vacuna_500g_383",
            "nombre": "Grasa Esani Vacuna 500g (383)",
            "descripcion": "Grasa vacuna Esani 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1720
          },
          {
            "id": "knorr_caldos_de_verdura_12u_366",
            "nombre": "Knorr Caldos de Verdura 12u (366)",
            "descripcion": "Caldos de verdura Knorr caja 12 unidades",
            "unidades_por_bulto": 12,
            "descripcion_bulto": "1 bulto = 12 unidades",
            "precio_bulto": 1450
          },
          {
            "id": "knorr_caldos_de_verdura_12u_caja_cerrada_366_1",
            "nombre": "Knorr Caldos de Verdura 12u Caja Cerrada (366-1)",
            "descripcion": "Caldos de verdura Knorr, precio por caja cerrada (80 unidades totales)",
            "unidades_por_bulto": 12,
            "descripcion_bulto": "1 bulto = 12 unidades (caja cerrada: 80 unidades)",
            "precio_bulto": 1350
          },
          {
            "id": "knorr_caldos_de_verdura_2u_367",
            "nombre": "Knorr Caldos de Verdura 2u (367)",
            "descripcion": "Caldos de verdura Knorr 2 unidades",
            "unidades_por_bulto": 2,
            "descripcion_bulto": "1 bulto = 2 unidades",
            "precio_bulto": 320
          },
          {
            "id": "knorr_caldos_de_verdura_6u_368",
            "nombre": "Knorr Caldos de Verdura 6u (368)",
            "descripcion": "Caldos de verdura Knorr 6 unidades",
            "unidades_por_bulto": 6,
            "descripcion_bulto": "1 bulto = 6 unidades",
            "precio_bulto": 830
          },
          {
            "id": "mayonesa_hellmanns_237g_369",
            "nombre": "Mayonesa Hellmann's 237g (369)",
            "descripcion": "Mayonesa Hellmann's pote 237 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 880
          },
          {
            "id": "mayonesa_hellmanns_475g_385",
            "nombre": "Mayonesa Hellmann's 475g (385)",
            "descripcion": "Mayonesa Hellmann's pote 475 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1650
          },
          {
            "id": "mayonesa_natura_125g_370",
            "nombre": "Mayonesa Natura 125g (370)",
            "descripcion": "Mayonesa Natura 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 450
          },
          {
            "id": "mayonesa_natura_1kg_382",
            "nombre": "Mayonesa Natura 1kg (382)",
            "descripcion": "Mayonesa Natura pote 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3900
          },
          {
            "id": "mayonesa_natura_250g_371",
            "nombre": "Mayonesa Natura 250g (371)",
            "descripcion": "Mayonesa Natura 250 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "queso_rallado_la_quesera_40g_388",
            "nombre": "Queso Rallado La Quesera 40g (388)",
            "descripcion": "Queso rallado La Quesera 40 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 570
          },
          {
            "id": "sal_fina_dos_anclas_estuche_500g_372",
            "nombre": "Sal Fina Dos Anclas Estuche 500g (372)",
            "descripcion": "Sal fina Dos Anclas 500 gramos en estuche",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "sal_fina_dos_estrellas_paquete_500g_373",
            "nombre": "Sal Fina Dos Estrellas Paquete 500g (373)",
            "descripcion": "Sal fina Dos Estrellas 500 gramos en paquete",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "sal_gruesa_dos_estrellas_paquete_1kg_374",
            "nombre": "Sal Gruesa Dos Estrellas Paquete 1kg (374)",
            "descripcion": "Sal gruesa Dos Estrellas 1 kilogramo en paquete",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "tahiti_chimichurri_casero_275g_375",
            "nombre": "Tahiti Chimichurri Casero 275g (375)",
            "descripcion": "Chimichurri casero Tahiti frasco 275 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1600
          },
          {
            "id": "vinagre_alcazar_500ml_381",
            "nombre": "Vinagre Alcázar 500ml (381)",
            "descripcion": "Vinagre Alcázar 500 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 530
          },
          {
            "id": "vinagre_marolio_500ml_alcohol_377",
            "nombre": "Vinagre Marolio Alcohol 500ml (377)",
            "descripcion": "Vinagre de alcohol Marolio 500 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 700
          },
          {
            "id": "vinagre_silva_5l_378",
            "nombre": "Vinagre Silva 5L (378)",
            "descripcion": "Vinagre Silva 5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2200
          },
          {
            "id": "vinagre_silva_900ml_379",
            "nombre": "Vinagre Silva 900ml (379)",
            "descripcion": "Vinagre Silva 900 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 660
          },
          {
            "id": "arroz_apostoles_500g",
            "nombre": "Arroz Apóstoles 500g",
            "descripcion": "Arroz Apóstoles paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 400
          },
          {
            "id": "arroz_canuelas_500g_423",
            "nombre": "Arroz Cañuelas 500g (423)",
            "descripcion": "Arroz Cañuelas paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 460
          },
          {
            "id": "arroz_elio_1kg_403",
            "nombre": "Arroz Elio 1kg (403)",
            "descripcion": "Arroz Elio paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "arroz_gallo_oro_parboil_1kg_bolsa_418",
            "nombre": "Arroz Gallo Oro Parboil 1kg Bolsa (418)",
            "descripcion": "Arroz Gallo Oro parboil 1 kilogramo en bolsa",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "arroz_gallo_oro_500g_404",
            "nombre": "Arroz Gallo Oro 500g (404)",
            "descripcion": "Arroz Gallo Oro paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1050
          },
          {
            "id": "arroz_lucchetti_1kg_largo_fino_406",
            "nombre": "Arroz Lucchetti Largo Fino 1kg (406)",
            "descripcion": "Arroz Lucchetti largo fino paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1450
          },
          {
            "id": "arroz_marolio_1kg_407",
            "nombre": "Arroz Marolio 1kg (407)",
            "descripcion": "Arroz Marolio paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "arroz_marolio_500g_408",
            "nombre": "Arroz Marolio 500g (408)",
            "descripcion": "Arroz Marolio paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "arroz_okita_1kg_410",
            "nombre": "Arroz Okita 1kg (410)",
            "descripcion": "Arroz Okita paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "arroz_tobogan_1kg_411",
            "nombre": "Arroz Tobogán 1kg (411)",
            "descripcion": "Arroz Tobogán paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 950
          },
          {
            "id": "fideos_308_nidos_al_huevo_500g_417",
            "nombre": "Fideos 308 Nidos al Huevo 500g (417)",
            "descripcion": "Fideos 308 tipo nidos al huevo 500 gramos (N°1, N°2, N°3, N°4)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1650
          },
          {
            "id": "fideos_lucchetti_rigatti_500g_412",
            "nombre": "Fideos Lucchetti Rigatti 500g (412)",
            "descripcion": "Fideos Lucchetti tipo rigatti 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 850
          },
          {
            "id": "fideos_marolio_500g_413",
            "nombre": "Fideos Marolio 500g (413)",
            "descripcion": "Fideos Marolio paquete de 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 550
          },
          {
            "id": "fideos_marolio_nido_al_huevo_500g_419",
            "nombre": "Fideos Marolio Nido al Huevo 500g (419)",
            "descripcion": "Fideos Marolio tipo nido al huevo 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "fideos_matarazzo_rigatti_500g_414",
            "nombre": "Fideos Matarazzo Rigatti 500g (414)",
            "descripcion": "Fideos Matarazzo tipo rigatti 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "fideos_santa_isabel_rigatti_500g_415",
            "nombre": "Fideos Santa Isabel Rigatti 500g (415)",
            "descripcion": "Fideos Santa Isabel tipo rigatti 500 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 500
          },
          {
            "id": "harina_canuelas_000_1kg_416",
            "nombre": "Harina Cañuelas 000 1kg (416)",
            "descripcion": "Harina Cañuelas tipo 000 paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 590
          },
          {
            "id": "harina_marolio_000_1kg_422",
            "nombre": "Harina Marolio 000 1kg (422)",
            "descripcion": "Harina Marolio tipo 000 paquete de 1 kilogramo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "agua_mineral_silva_5l",
            "nombre": "Agua Mineral Silva 5L",
            "descripcion": "Agua mineral Silva bidón de 5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "agua_tonica_paso_de_los_toros_1_5l_450",
            "nombre": "Agua Tónica Paso de los Toros 1.5L (450)",
            "descripcion": "Agua tónica Paso de los Toros botella 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1800
          },
          {
            "id": "cerveza_361_1_5l_descartable_482",
            "nombre": "Cerveza 361 1.5L Descartable (482)",
            "descripcion": "Cerveza 361 botella descartable 1.5 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1800
          },
          {
            "id": "cerveza_361_1l_descartable_477",
            "nombre": "Cerveza 361 1L Descartable (477)",
            "descripcion": "Cerveza 361 botella descartable 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "cerveza_brahma_1l_cajon_498",
            "nombre": "Cerveza Brahma 1L (Cajón) (498)",
            "descripcion": "Cerveza Brahma botella retornable 1 litro (cajón)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "cerveza_brahma_473ml_lata_451",
            "nombre": "Cerveza Brahma 473ml Lata (451)",
            "descripcion": "Cerveza Brahma lata 473 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1220
          },
          {
            "id": "cerveza_brahma_710ml_lata_492",
            "nombre": "Cerveza Brahma 710ml Lata (492)",
            "descripcion": "Cerveza Brahma lata 710 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2150
          },
          {
            "id": "cerveza_budweiser_1l_cajon_497",
            "nombre": "Cerveza Budweiser 1L Cajón (497)",
            "descripcion": "Cerveza Budweiser botella retornable 1 litro (cajón)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "cerveza_budweiser_473ml_lata_481",
            "nombre": "Cerveza Budweiser 473ml Lata (481)",
            "descripcion": "Cerveza Budweiser lata 473 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1180
          },
          {
            "id": "cerveza_corona_330ml_porron_452",
            "nombre": "Cerveza Corona 330ml Porrón (452)",
            "descripcion": "Cerveza Corona porrón 330 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1850
          },
          {
            "id": "cerveza_corona_710ml_453",
            "nombre": "Cerveza Corona 710ml (453)",
            "descripcion": "Cerveza Corona botella 710 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3200
          },
          {
            "id": "cerveza_quilmes_1l_cajon_496",
            "nombre": "Cerveza Quilmes 1L Cajón (496)",
            "descripcion": "Cerveza Quilmes botella retornable 1 litro (cajón)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2420
          },
          {
            "id": "cerveza_quilmes_473ml_lata_480",
            "nombre": "Cerveza Quilmes 473ml Lata (480)",
            "descripcion": "Cerveza Quilmes lata 473 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "cerveza_quilmes_710ml_lata_493",
            "nombre": "Cerveza Quilmes 710ml Lata (493)",
            "descripcion": "Cerveza Quilmes lata 710 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2150
          },
          {
            "id": "cerveza_schneider_473ml_lata_3026",
            "nombre": "Cerveza Schneider 473ml Lata (3026)",
            "descripcion": "Cerveza Schneider lata 473 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1120
          },
          {
            "id": "cerveza_stella_1l_cajon_499",
            "nombre": "Cerveza Stella 1L Cajón (499)",
            "descripcion": "Cerveza Stella Artois botella retornable 1 litro (cajón)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3200
          },
          {
            "id": "cerveza_stella_330ml_porron_490",
            "nombre": "Cerveza Stella 330ml Porrón (490)",
            "descripcion": "Cerveza Stella Artois porrón 330 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1350
          },
          {
            "id": "cerveza_stella_473ml_lata_491",
            "nombre": "Cerveza Stella 473ml Lata (491)",
            "descripcion": "Cerveza Stella Artois lata 473 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1690
          },
          {
            "id": "cerveza_zeus_1l_descartable_455",
            "nombre": "Cerveza Zeus 1L Descartable (455)",
            "descripcion": "Cerveza Zeus botella descartable 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1350
          },
          {
            "id": "fernet_1882_1l_485",
            "nombre": "Fernet 1882 1L (485)",
            "descripcion": "Fernet 1882 botella 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6500
          },
          {
            "id": "fernet_1882_750ml_487",
            "nombre": "Fernet 1882 750ml (487)",
            "descripcion": "Fernet 1882 botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5500
          },
          {
            "id": "gancia_1_25l_457",
            "nombre": "Gancia 1.25L (457)",
            "descripcion": "Aperitivo Gancia botella 1.25 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5700
          },
          {
            "id": "gaseosa_7up_2l_439",
            "nombre": "Gaseosa 7UP 2L (439)",
            "descripcion": "Gaseosa 7UP botella 2 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1600
          },
          {
            "id": "gaseosa_mirinda_2_25l_460",
            "nombre": "Gaseosa Mirinda 2.25L (460)",
            "descripcion": "Gaseosa Mirinda botella 2.25 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "gaseosa_pepsi_2l_461",
            "nombre": "Gaseosa Pepsi 2L (461)",
            "descripcion": "Gaseosa Pepsi botella 2 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1600
          },
          {
            "id": "gaseosa_pepsi_3l_495",
            "nombre": "Gaseosa Pepsi 3L (495)",
            "descripcion": "Gaseosa Pepsi botella 3 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2030
          },
          {
            "id": "gatorade_1_25l_manzana_462",
            "nombre": "Gatorade 1.25L Manzana (462)",
            "descripcion": "Bebida deportiva Gatorade sabor manzana botella 1.25 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1650
          },
          {
            "id": "gatorade_750ml_manzana_486",
            "nombre": "Gatorade 750ml Manzana (486)",
            "descripcion": "Bebida deportiva Gatorade sabor manzana botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1180
          },
          {
            "id": "vino_luigi_bosca_750ml_788",
            "nombre": "Vino Luigi Bosca 750ml (788)",
            "descripcion": "Vino Luigi Bosca botella 750 mililitros, varias líneas",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 8750
          },
          {
            "id": "terma_1_35l_limon_serrano",
            "nombre": "Terma 1.35L Limón/Serrano",
            "descripcion": "Bebida sin alcohol Terma sabor limón o serrano 1.35 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1350
          },
          {
            "id": "vino_carcasone_700ml_tinto_464",
            "nombre": "Vino Carcasone 700ml Tinto (464)",
            "descripcion": "Vino tinto Carcasone botella 700 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2050
          },
          {
            "id": "vino_chacabucо_750ml_malbec_cabernet_465",
            "nombre": "Vino Chacabuco 750ml Malbec/Cabernet (465)",
            "descripcion": "Vino Chacabuco 750 mililitros, varietales Malbec o Cabernet Sauvignon",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2700
          },
          {
            "id": "vino_encepado_1_125l_tinto_clasico_dulce_466",
            "nombre": "Vino Encepado 1.125L Tinto Clásico/Dulce (466)",
            "descripcion": "Vino Encepado tinto clásico o dulce botellón 1.125 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1560
          },
          {
            "id": "vino_estancia_mendoza_blanco_chenin_dulce_467",
            "nombre": "Vino Estancia Mendoza Blanco Chenin Dulce (467)",
            "descripcion": "Vino blanco dulce Estancia Mendoza varietal Chenin",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2400
          },
          {
            "id": "vino_norton_cosecha_tardia_blanco_dulce_468",
            "nombre": "Vino Norton Cosecha Tardía Blanco Dulce (468)",
            "descripcion": "Vino blanco dulce Norton Cosecha Tardía 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "vino_norton_cosecha_tardia_rosado_dulce_468_2",
            "nombre": "Vino Norton Cosecha Tardía Rosado Dulce (468-2)",
            "descripcion": "Vino rosado dulce Norton Cosecha Tardía 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "vino_norton_cosecha_tardia_tinto_dulce_468_1",
            "nombre": "Vino Norton Cosecha Tardía Tinto Dulce (468-1)",
            "descripcion": "Vino tinto dulce Norton Cosecha Tardía 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "vino_novecento_malbec_750ml_494",
            "nombre": "Vino Novecento Malbec 750ml (494)",
            "descripcion": "Vino Novecento varietal Malbec botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "vino_oveja_black_750ml_459",
            "nombre": "Vino Oveja Black 750ml (459)",
            "descripcion": "Vino Oveja Black botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "vino_resero_blanco_1l_tetra_pack_469",
            "nombre": "Vino Resero Blanco 1L Tetra Pack (469)",
            "descripcion": "Vino blanco Resero 1 litro en envase Tetra Pack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1300
          },
          {
            "id": "vino_resero_tinto_1l_tetra_pack_470",
            "nombre": "Vino Resero Tinto 1L Tetra Pack (470)",
            "descripcion": "Vino tinto Resero 1 litro en envase Tetra Pack",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1390
          },
          {
            "id": "vino_resero_tinto_750ml_472",
            "nombre": "Vino Resero Tinto 750ml (472)",
            "descripcion": "Vino Resero tinto botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "vino_suc_michel_torino_tinto_700ml_473",
            "nombre": "Vino Suc. Michel Torino Tinto 700ml (473)",
            "descripcion": "Vino tinto Suc. Michel Torino botella 700 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "vino_toro_viejo_tinto_botellon_1l_478",
            "nombre": "Vino Toro Viejo Tinto Botellón 1L (478)",
            "descripcion": "Vino Toro Viejo tinto botellón 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1850
          },
          {
            "id": "vino_trumpeter_malbec_750ml_474",
            "nombre": "Vino Trumpeter Malbec 750ml (474)",
            "descripcion": "Vino Trumpeter varietal Malbec botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6500
          },
          {
            "id": "vino_vinas_de_alvear_tinto_1_125l_475",
            "nombre": "Vino Viñas de Alvear Tinto 1.125L (475)",
            "descripcion": "Vino Viñas de Alvear tinto botellón 1.125 litros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "whisky_criadores_1l_476",
            "nombre": "Whisky Criadores 1L (476)",
            "descripcion": "Whisky Criadores botella 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6500
          },
          {
            "id": "whisky_white_horse_750ml_484",
            "nombre": "Whisky White Horse 750ml (484)",
            "descripcion": "Whisky White Horse botella 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 11550
          },
          {
            "id": "algodon_estrella_75g_clasico",
            "nombre": "Algodón Estrella 75g Clásico",
            "descripcion": "Algodón Estrella clásico 75 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 690
          },
          {
            "id": "cepillo_dientes_colgate_extra_clean_pack2_501",
            "nombre": "Cepillo de Dientes Colgate Extra Clean Pack x2 (501)",
            "descripcion": "Cepillos de dientes Colgate Extra Clean pack por 2 unidades",
            "unidades_por_bulto": 2,
            "descripcion_bulto": "1 bulto = 2 unidades",
            "precio_bulto": 1700
          },
          {
            "id": "cepillo_dientes_colgate_premier_clean_14x12_502",
            "nombre": "Cepillo de Dientes Colgate Premier Clean 14x12 (502)",
            "descripcion": "Cepillo de dientes Colgate Premier Clean presentación 14x12 unidades",
            "unidades_por_bulto": 12,
            "descripcion_bulto": "1 bulto = 12 unidades",
            "precio_bulto": 9900
          },
          {
            "id": "crema_corporal_hinds_125ml_503",
            "nombre": "Crema Corporal Hinds 125ml (503)",
            "descripcion": "Crema corporal Hinds frasco 125 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1850
          },
          {
            "id": "crema_nivea_lata_60g_504",
            "nombre": "Crema Nivea Lata 60g (504)",
            "descripcion": "Crema Nivea clásica en lata 60 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1800
          },
          {
            "id": "curitas_8u_505",
            "nombre": "Curitas 8 Unidades (505)",
            "descripcion": "Tiras adhesivas curitas presentación por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 580
          },
          {
            "id": "dentifrico_colgate_70g_original_506",
            "nombre": "Dentífrico Colgate 70g Original (506)",
            "descripcion": "Pasta dental Colgate sabor original 70 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "dentifrico_colgate_90g_triple_accion_532",
            "nombre": "Dentífrico Colgate 90g Triple Acción (532)",
            "descripcion": "Pasta dental Colgate Triple Acción 90 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "desodorante_aerosol_axe_varias_fragancias_507",
            "nombre": "Desodorante Aerosol Axe Varias Fragancias (507)",
            "descripcion": "Desodorante en aerosol Axe varias fragancias 150 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2200
          },
          {
            "id": "desodorante_aerosol_ciel_123ml_varias_fragancias_508",
            "nombre": "Desodorante Aerosol Ciel 123ml Varias Fragancias (508)",
            "descripcion": "Desodorante en aerosol Ciel 123ml (Original, Nuit, Rose, Noir, Crystal, Dete, Maggi)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2770
          },
          {
            "id": "dentifrico_colgate_90g_original_573",
            "nombre": "Dentífrico Colgate 90g Original (573)",
            "descripcion": "Pasta dental Colgate sabor original 90 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1600
          },
          {
            "id": "dentifrico_oralb_70g_original_574",
            "nombre": "Dentífrico Oral-B 70g Original (574)",
            "descripcion": "Pasta dental Oral-B sabor original 70 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 950
          },
          {
            "id": "dentifrico_oralb_70g_original_caja_cerrada_574_1",
            "nombre": "Dentífrico Oral-B 70g Original Caja Cerrada (574-1)",
            "descripcion": "Pasta dental Oral-B 70 gramos sabor original, precio por caja cerrada",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = caja cerrada",
            "precio_bulto": 880
          },
          {
            "id": "desodorante_aerosol_ciel_186ml_varias_fragancias_509",
            "nombre": "Desodorante Aerosol Ciel 186ml Varias Fragancias (509)",
            "descripcion": "Desodorante en aerosol Ciel 186ml (Original, Nuit, Rose, Noir, Crystal, Dete, Maggi)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3100
          },
          {
            "id": "desodorante_aerosol_colbert_150ml_varias_fragancias_510",
            "nombre": "Desodorante Aerosol Colbert 150ml Varias Fragancias (510)",
            "descripcion": "Desodorante Colbert en aerosol 150ml (Noir, Original, Acqua, US)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2920
          },
          {
            "id": "desodorante_aerosol_colbert_250ml_varias_fragancias_511",
            "nombre": "Desodorante Aerosol Colbert 250ml Varias Fragancias (511)",
            "descripcion": "Desodorante Colbert en aerosol 250ml (Noir, Original, Acqua, US)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3410
          },
          {
            "id": "desodorante_aerosol_kevin_150ml_varias_fragancias_512",
            "nombre": "Desodorante Aerosol Kevin 150ml Varias Fragancias (512)",
            "descripcion": "Desodorante Kevin en aerosol 150ml (Original, Black, Spirit, Park)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2880
          },
          {
            "id": "desodorante_aerosol_kevin_250ml_varias_fragancias_513",
            "nombre": "Desodorante Aerosol Kevin 250ml Varias Fragancias (513)",
            "descripcion": "Desodorante Kevin en aerosol 250ml (Original, Black, Spirit, Park)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3400
          },
          {
            "id": "desodorante_aerosol_rexona_men_varias_fragancias_514",
            "nombre": "Desodorante Aerosol Rexona Men Varias Fragancias (514)",
            "descripcion": "Desodorante en aerosol Rexona Men varias fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2250
          },
          {
            "id": "desodorante_aerosol_rexona_women_varias_fragancias_515",
            "nombre": "Desodorante Aerosol Rexona Women Varias Fragancias (515)",
            "descripcion": "Desodorante en aerosol Rexona Women varias fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2250
          },
          {
            "id": "desodorante_crema_rexona_odorono_516",
            "nombre": "Desodorante en Crema Rexona Odorono (516)",
            "descripcion": "Desodorante en crema Rexona línea Odorono",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "elvive_shampoo_acondicionador_200ml_517",
            "nombre": "Elvive Shampoo/Acondicionador 200ml (517)",
            "descripcion": "Shampoo o acondicionador Elvive presentación 200 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2900
          },
          {
            "id": "elvive_shampoo_acondicionador_400ml_518",
            "nombre": "Elvive Shampoo/Acondicionador 400ml (518)",
            "descripcion": "Shampoo o acondicionador Elvive presentación 400 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5000
          },
          {
            "id": "gel_lord_cheseline_280g_519",
            "nombre": "Gel Lord Cheseline 280g (519)",
            "descripcion": "Gel para cabello Lord Cheseline 280 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "head_shoulders_shampoo_180ml_520",
            "nombre": "Head & Shoulders Shampoo 180ml (520)",
            "descripcion": "Shampoo anticaspa Head & Shoulders 180 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3400
          },
          {
            "id": "head_shoulders_shampoo_375ml_538",
            "nombre": "Head & Shoulders Shampoo 375ml (538)",
            "descripcion": "Shampoo anticaspa Head & Shoulders 375 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5850
          },
          {
            "id": "jabon_tocador_dove_90g_varias_fragancias_521",
            "nombre": "Jabón de Tocador Dove 90g Varias Fragancias (521)",
            "descripcion": "Jabón de tocador Dove 90 gramos, todas las fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1250
          },
          {
            "id": "jabon_tocador_lux_125g_537",
            "nombre": "Jabón de Tocador Lux 125g (537)",
            "descripcion": "Jabón de tocador Lux 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "jabon_tocador_nivea_125g_531",
            "nombre": "Jabón de Tocador Nivea 125g (531)",
            "descripcion": "Jabón de tocador Nivea 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1000
          },
          {
            "id": "jabon_tocador_plusbelle_125g_535",
            "nombre": "Jabón de Tocador Plusbelle 125g (535)",
            "descripcion": "Jabón de tocador Plusbelle 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 750
          },
          {
            "id": "jabon_tocador_rexona_125g_536",
            "nombre": "Jabón de Tocador Rexona 125g (536)",
            "descripcion": "Jabón de tocador Rexona 125 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "jabon_tocador_veritas_120g",
            "nombre": "Jabón de Tocador Veritas 120g",
            "descripcion": "Jabón de tocador Veritas 120 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "pantene_shampoo_acondicionador_200ml_523",
            "nombre": "Pantene Shampoo/Acondicionador 200ml (523)",
            "descripcion": "Shampoo o acondicionador Pantene 200 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2700
          },
          {
            "id": "pantene_shampoo_acondicionador_400ml_524",
            "nombre": "Pantene Shampoo/Acondicionador 400ml (524)",
            "descripcion": "Shampoo o acondicionador Pantene 400 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 4750
          },
          {
            "id": "plusbelle_shampoo_acondicionador_1l_525",
            "nombre": "Plusbelle Shampoo/Acondicionador 1L (525)",
            "descripcion": "Shampoo o acondicionador Plusbelle 1 litro",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "prestobarba_gillette_azul_filo_simple_526",
            "nombre": "Prestobarba Gillette Azul Filo Simple (526)",
            "descripcion": "Afeitadora Gillette Prestobarba color azul, filo simple",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 900
          },
          {
            "id": "prestobarba_gillette_gris_triple_filo_527",
            "nombre": "Prestobarba Gillette Gris Triple Filo (527)",
            "descripcion": "Afeitadora Gillette Prestobarba color gris, triple filo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1300
          },
          {
            "id": "sedal_shampoo_acondicionador_190ml_528",
            "nombre": "Sedal Shampoo/Acondicionador 190ml (528)",
            "descripcion": "Shampoo o acondicionador Sedal 190 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "sedal_shampoo_acondicionador_340ml_529",
            "nombre": "Sedal Shampoo/Acondicionador 340ml (529)",
            "descripcion": "Shampoo o acondicionador Sedal 340 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3000
          },
          {
            "id": "tintura_leau_vive_consultar_colores_530",
            "nombre": "Tintura Leau Vive (Consultar Colores) (530)",
            "descripcion": "Tintura para el cabello Leau Vive, consultar colores disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1700
          },
          {
            "id": "tresemme_acondicionador_500ml_533",
            "nombre": "TRESemmé Acondicionador 500ml (533)",
            "descripcion": "Acondicionador TRESemmé 500 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2950
          },
          {
            "id": "tresemme_acondicionador_880ml_534",
            "nombre": "TRESemmé Acondicionador 880ml (534)",
            "descripcion": "Acondicionador TRESemmé 880 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": null
          },
          {
            "id": "dentifrico_colgate_kids_50g_strawberry",
            "nombre": "Dentífrico Colgate Kids 50g Strawberry",
            "descripcion": "Pasta dental infantil Colgate Kids sabor frutilla 50 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "dentifrico_odolito_50g_551",
            "nombre": "Dentífrico Odolito 50g (551)",
            "descripcion": "Pasta dental infantil Odolito 50 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "paniales_babysec_ultra_hiperpack_552",
            "nombre": "Pañales Babysec Ultra Hiperpack (552)",
            "descripcion": "Pañales Babysec Ultra presentación Hiperpack, múltiples talles disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 hiperpack",
            "precio_bulto": 7000
          },
          {
            "id": "paniales_babysec_ultra_reg_8u_553",
            "nombre": "Pañales Babysec Ultra Regulares 8U (553)",
            "descripcion": "Pañales Babysec Ultra regulares paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 1900
          },
          {
            "id": "paniales_estrella_hiperpack_554",
            "nombre": "Pañales Estrella Hiperpack (554)",
            "descripcion": "Pañales Estrella presentación Hiperpack, múltiples talles disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 hiperpack",
            "precio_bulto": 9000
          },
          {
            "id": "paniales_huggies_classic_8u_xxg_555",
            "nombre": "Pañales Huggies Classic 8U XXG (555)",
            "descripcion": "Pañales Huggies Classic talle XXG paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 1800
          },
          {
            "id": "paniales_huggies_classic_ahorra_pack_556",
            "nombre": "Pañales Huggies Classic Ahorra Pack (556)",
            "descripcion": "Pañales Huggies Classic presentación Ahorra Pack, múltiples talles disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 pack grande",
            "precio_bulto": 11000
          },
          {
            "id": "paniales_huggies_protec_8u_pmg_557",
            "nombre": "Pañales Huggies Protec 8U P/M/G (557)",
            "descripcion": "Pañales Huggies Protec paquete por 8 unidades talles P, M o G",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 1400
          },
          {
            "id": "paniales_huggies_protec_8u_xg_xxg_558",
            "nombre": "Pañales Huggies Protec 8U XG/XXG (558)",
            "descripcion": "Pañales Huggies Protec paquete por 8 unidades talles XG o XXG",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 2000
          },
          {
            "id": "paniales_huggies_protec_ahorra_pack_559",
            "nombre": "Pañales Huggies Protec Ahorra Pack (559)",
            "descripcion": "Pañales Huggies Protec presentación Ahorra Pack, múltiples talles disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 pack grande",
            "precio_bulto": 14000
          },
          {
            "id": "toallitas_humedas_babysec_ultra_50u_570",
            "nombre": "Toallitas Húmedas Babysec Ultra 50U (570)",
            "descripcion": "Toallitas húmedas Babysec Ultra paquete por 50 unidades",
            "unidades_por_bulto": 50,
            "descripcion_bulto": "1 bulto = 50 unidades",
            "precio_bulto": 1900
          },
          {
            "id": "toallitas_humedas_huggies_48u_amarillas_549",
            "nombre": "Toallitas Húmedas Huggies 48U Amarillas (549)",
            "descripcion": "Toallitas húmedas Huggies línea amarilla paquete por 48 unidades",
            "unidades_por_bulto": 48,
            "descripcion_bulto": "1 bulto = 48 unidades",
            "precio_bulto": 2200
          },
          {
            "id": "toallitas_humedas_johnsons_44u_560",
            "nombre": "Toallitas Húmedas Johnson’s 44U (560)",
            "descripcion": "Toallitas húmedas Johnson’s Baby paquete por 44 unidades",
            "unidades_por_bulto": 44,
            "descripcion_bulto": "1 bulto = 44 unidades",
            "precio_bulto": 2400
          },
          {
            "id": "calipso_protectores_20u_rosa",
            "nombre": "Calipso Protectores 20U Rosa",
            "descripcion": "Protectores diarios Calipso color rosa paquete por 20 unidades",
            "unidades_por_bulto": 20,
            "descripcion_bulto": "1 bulto = 20 unidades",
            "precio_bulto": 650
          },
          {
            "id": "calipso_protectores_50u_rosa_562",
            "nombre": "Calipso Protectores 50U Rosa (562)",
            "descripcion": "Protectores diarios Calipso color rosa paquete por 50 unidades",
            "unidades_por_bulto": 50,
            "descripcion_bulto": "1 bulto = 50 unidades",
            "precio_bulto": 1510
          },
          {
            "id": "calipso_toallitas_8u_verde_563",
            "nombre": "Calipso Toallitas 8U Verde (563)",
            "descripcion": "Toallitas femeninas Calipso color verde paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 694
          },
          {
            "id": "doncella_protectores_20u_567",
            "nombre": "Doncella Protectores 20U (567)",
            "descripcion": "Protectores diarios Doncella paquete por 20 unidades",
            "unidades_por_bulto": 20,
            "descripcion_bulto": "1 bulto = 20 unidades",
            "precio_bulto": 600
          },
          {
            "id": "doncella_toallitas_16u_rosa_564",
            "nombre": "Doncella Toallitas 16U Rosa (564)",
            "descripcion": "Toallitas femeninas Doncella color rosa paquete por 16 unidades",
            "unidades_por_bulto": 16,
            "descripcion_bulto": "1 bulto = 16 unidades",
            "precio_bulto": 1071
          },
          {
            "id": "doncella_toallitas_8u_nocturnas_568",
            "nombre": "Doncella Toallitas 8U Nocturnas (568)",
            "descripcion": "Toallitas femeninas Doncella nocturnas paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 760
          },
          {
            "id": "doncella_toallitas_8u_rosa_565",
            "nombre": "Doncella Toallitas 8U Rosa (565)",
            "descripcion": "Toallitas femeninas Doncella color rosa paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 500
          },
          {
            "id": "ladysoft_toallitas_8u_normal_566",
            "nombre": "Ladysoft Toallitas 8U Normal (566)",
            "descripcion": "Toallitas femeninas Ladysoft normal paquete por 8 unidades",
            "unidades_por_bulto": 8,
            "descripcion_bulto": "1 bulto = 8 unidades",
            "precio_bulto": 610
          },
          {
            "id": "aromatizantes_aerosol_saphirus_varias_fragancias",
            "nombre": "Aromatizantes Aerosol Saphirus Variedad de Fragancias",
            "descripcion": "Aromatizante ambiental Saphirus en aerosol, variedad de fragancias disponibles",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3820
          },
          {
            "id": "aromatizantes_saphirus_difusor_palitos_675",
            "nombre": "Aromatizantes Saphirus Difusor (Palitos) (675)",
            "descripcion": "Difusor ambiental Saphirus con palitos aromáticos, varias fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3750
          },
          {
            "id": "aromatizantes_saphirus_equipos_maquina_676",
            "nombre": "Aromatizantes Saphirus Equipos (Máquina) (676)",
            "descripcion": "Equipo aromatizador automático Saphirus (máquina dispensadora)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 10300
          },
          {
            "id": "aromatizantes_textil_saphirus_varias_fragancias_601",
            "nombre": "Aromatizantes Textil Saphirus Variedad de Fragancias (601)",
            "descripcion": "Aromatizante textil Saphirus para telas y ambientes, variedad de fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2650
          },
          {
            "id": "desinfectante_aerosol_ayudin_332ml_original_671",
            "nombre": "Desinfectante Aerosol Ayudín 332ml Original (671)",
            "descripcion": "Desinfectante en aerosol Ayudín 332 mililitros fragancia original",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1700
          },
          {
            "id": "desinfectante_aerosol_lysoform_360ml_602",
            "nombre": "Desinfectante Aerosol Lysoform 360ml (602)",
            "descripcion": "Desinfectante en aerosol Lysoform 360 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2300
          },
          {
            "id": "desodorante_aerosol_glade_varias_fragancias_603",
            "nombre": "Desodorante Aerosol Glade Varias Fragancias (603)",
            "descripcion": "Desodorante ambiental Glade en aerosol, variedad de fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1950
          },
          {
            "id": "desodorante_aerosol_poett_360ml_604",
            "nombre": "Desodorante Aerosol Poett 360ml (604)",
            "descripcion": "Desodorante ambiental Poett en aerosol 360 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1950
          },
          {
            "id": "detergente_ala_750ml_605",
            "nombre": "Detergente Ala 750ml (605)",
            "descripcion": "Detergente líquido para vajilla marca Ala 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "detergente_cif_300ml_606",
            "nombre": "Detergente Cif 300ml (606)",
            "descripcion": "Detergente líquido concentrado Cif 300 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1150
          },
          {
            "id": "detergente_esencial_750ml",
            "nombre": "Detergente Esencial 750ml",
            "descripcion": "Detergente líquido Esencial 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 940
          },
          {
            "id": "detergente_gigante_750ml_608",
            "nombre": "Detergente Gigante 750ml (608)",
            "descripcion": "Detergente líquido Gigante 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 800
          },
          {
            "id": "detergente_heroe_750ml_658",
            "nombre": "Detergente Héroe 750ml (658)",
            "descripcion": "Detergente líquido Héroe 750 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 760
          },
          {
            "id": "detergente_magistral_225ml_674",
            "nombre": "Detergente Magistral 225ml (674)",
            "descripcion": "Detergente líquido Magistral 225 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1180
          },
          {
            "id": "detergente_magistral_300ml_610",
            "nombre": "Detergente Magistral 300ml (610)",
            "descripcion": "Detergente líquido Magistral 300 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1500
          },
          {
            "id": "detergente_magistral_500ml_611",
            "nombre": "Detergente Magistral 500ml (611)",
            "descripcion": "Detergente líquido Magistral 500 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "espirales_raid_clasicos_12u_estuche_612",
            "nombre": "Espirales Raid Clásicos 12U (Estuche) (612)",
            "descripcion": "Espirales insecticidas Raid clásicos estuche por 12 unidades",
            "unidades_por_bulto": 12,
            "descripcion_bulto": "1 bulto = 12 unidades",
            "precio_bulto": 2100
          },
          {
            "id": "espirales_raid_clasicos_4u_paquetito_613",
            "nombre": "Espirales Raid Clásicos 4U (Paquetito) (613)",
            "descripcion": "Espirales insecticidas Raid clásicos paquetito por 4 unidades (estuche completo trae 12 paquetes)",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 unidades",
            "precio_bulto": 800
          },
          {
            "id": "espirales_raid_country_12u_estuche_614",
            "nombre": "Espirales Raid Country 12U (Estuche) (614)",
            "descripcion": "Espirales insecticidas Raid Country estuche por 12 unidades",
            "unidades_por_bulto": 12,
            "descripcion_bulto": "1 bulto = 12 unidades",
            "precio_bulto": 2500
          },
          {
            "id": "foslit_encendedores_704",
            "nombre": "Foslit Encendedores (704)",
            "descripcion": "Encendedores Foslit varios colores",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 180
          },
          {
            "id": "foslit_magiclick_703",
            "nombre": "Foslit Magiclick (703)",
            "descripcion": "Encendedor recargable Foslit Magiclick automático",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "insecticida_baygon_616",
            "nombre": "Insecticida Baygon (616)",
            "descripcion": "Insecticida aerosol Baygon para insectos voladores y rastreros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "insecticida_fuyi_617",
            "nombre": "Insecticida Fuyi (617)",
            "descripcion": "Insecticida aerosol Fuyi, protección total contra mosquitos y moscas",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3300
          },
          {
            "id": "insecticida_raid_azul_618",
            "nombre": "Insecticida Raid Azul (618)",
            "descripcion": "Insecticida en aerosol Raid color azul, uso doméstico",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 4200
          },
          {
            "id": "insecticida_selton_azul_670",
            "nombre": "Insecticida Selton Azul (670)",
            "descripcion": "Insecticida en aerosol Selton color azul",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "insecticida_selton_rojo_669",
            "nombre": "Insecticida Selton Rojo (669)",
            "descripcion": "Insecticida en aerosol Selton color rojo",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2500
          },
          {
            "id": "jabon_polvo_granby_400g_619",
            "nombre": "Jabón en Polvo Granby 400g (619)",
            "descripcion": "Jabón en polvo Granby paquete 400 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 650
          },
          {
            "id": "jabon_polvo_granby_800g_620",
            "nombre": "Jabón en Polvo Granby 800g (620)",
            "descripcion": "Jabón en polvo Granby paquete 800 gramos",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1200
          },
          {
            "id": "jabon_polvo_zorro_400g_matic_regular_621",
            "nombre": "Jabón en Polvo Zorro 400g Matic/Regular (621)",
            "descripcion": "Jabón en polvo Zorro 400 gramos, versión Matic o Regular",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 730
          },
          {
            "id": "jabon_liquido_ace_clasico_3l_dp_647",
            "nombre": "Jabón Líquido Ace Clásico 3L D.P (647)",
            "descripcion": "Jabón líquido para ropa Ace Clásico 3 litros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 5200
          },
          {
            "id": "jabon_liquido_ala_150ml_para_diluir_sin_botellon_622",
            "nombre": "Jabón Líquido Ala 150ml Para Diluir (Sin Botellón) (622)",
            "descripcion": "Jabón líquido Ala 150 mililitros concentrado para diluir, sin botellón",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "jabon_liquido_ala_3l_dp_623",
            "nombre": "Jabón Líquido Ala 3L D.P (623)",
            "descripcion": "Jabón líquido para ropa Ala 3 litros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6000
          },
          {
            "id": "jabon_liquido_ala_500ml_para_diluir_sin_botellon_624",
            "nombre": "Jabón Líquido Ala 500ml Para Diluir (Sin Botellón) (624)",
            "descripcion": "Jabón líquido Ala 500 mililitros concentrado para diluir, sin botellón",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 4000
          },
          {
            "id": "jabon_liquido_ala_800ml_dp_625",
            "nombre": "Jabón Líquido Ala 800ml D.P (625)",
            "descripcion": "Jabón líquido Ala 800 mililitros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1900
          },
          {
            "id": "limpiador_liquido_cif_450ml_dp_bano",
            "nombre": "Limpiador Líquido Cif 450ml D.P Baño",
            "descripcion": "Limpiador líquido Cif 450 mililitros para baño (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "limpiador_liquido_cif_450ml_dp_vidrios_643_2",
            "nombre": "Limpiador Líquido Cif 450ml D.P Vidrios (643-2)",
            "descripcion": "Limpiador líquido Cif 450 mililitros para vidrios (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "limpiador_liquido_mr_musculo_450ml_dp_antigrasa_672",
            "nombre": "Limpiador Líquido Mr. Músculo 450ml D.P Antigrasa (672)",
            "descripcion": "Limpiador líquido Mr. Músculo 450 mililitros antigrasa (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          },
          {
            "id": "limpiador_poett_900ml_662",
            "nombre": "Limpiador Poett 900ml (662)",
            "descripcion": "Limpiador líquido Poett 900 mililitros, varias fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1080
          },
          {
            "id": "limpiador_val_4l_771",
            "nombre": "Limpiador Val 4L (771)",
            "descripcion": "Limpiador líquido Val 4 litros, varias fragancias",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2800
          },
          {
            "id": "limpiador_val_900ml_lavanda_770",
            "nombre": "Limpiador Val 900ml Lavanda (770)",
            "descripcion": "Limpiador líquido Val 900 mililitros fragancia lavanda",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 660
          },
          {
            "id": "lustramuebles_aerosol_blem_360ml_original_644",
            "nombre": "Lustramuebles Aerosol Blem 360ml Original (644)",
            "descripcion": "Lustramuebles Blem aerosol 360 mililitros fragancia original",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 3300
          },
          {
            "id": "panuelos_descartables_elite_pack_6x10_645",
            "nombre": "Pañuelos Descartables Elite Pack 6x10 (645)",
            "descripcion": "Pañuelos descartables Elite, pack de 6 paquetes con 10 unidades cada uno",
            "unidades_por_bulto": 60,
            "descripcion_bulto": "1 bulto = 60 unidades (6x10)",
            "precio_bulto": 1000
          },
          {
            "id": "papel_aluminio_mar_de_flor_702",
            "nombre": "Papel Aluminio Mar de Flor (702)",
            "descripcion": "Rollo de papel aluminio Mar de Flor para cocina",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 720
          },
          {
            "id": "papel_film_mar_de_flor_701",
            "nombre": "Papel Film Mar de Flor (701)",
            "descripcion": "Rollo de papel film transparente Mar de Flor",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 650
          },
          {
            "id": "papel_higienico_cautiva_4x30m_646",
            "nombre": "Papel Higiénico Cautiva 4x30m (646)",
            "descripcion": "Papel higiénico Cautiva paquete de 4 rollos de 30 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 860
          },
          {
            "id": "papel_higienico_elite_4x80m_648",
            "nombre": "Papel Higiénico Elite 4x80m (648)",
            "descripcion": "Papel higiénico Elite paquete de 4 rollos de 80 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 2800
          },
          {
            "id": "papel_higienico_felpita_4x30m_649",
            "nombre": "Papel Higiénico Felpita 4x30m (649)",
            "descripcion": "Papel higiénico Felpita paquete de 4 rollos de 30 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 1350
          },
          {
            "id": "papel_higienico_higienol_fresh_4x30m_715",
            "nombre": "Papel Higiénico Higienol Fresh 4x30m (715)",
            "descripcion": "Papel higiénico Higienol Fresh paquete de 4 rollos de 30 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 1150
          },
          {
            "id": "papel_higienico_higienol_max_4x80m_650",
            "nombre": "Papel Higiénico Higienol Max 4x80m (650)",
            "descripcion": "Papel higiénico Higienol Max paquete de 4 rollos de 80 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 2900
          },
          {
            "id": "papel_higienico_higienol_plus_4x30m_doble_hoja_651",
            "nombre": "Papel Higiénico Higienol Plus 4x30m Doble Hoja (651)",
            "descripcion": "Papel higiénico Higienol Plus doble hoja, paquete de 4 rollos de 30 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 2000
          },
          {
            "id": "papel_higienico_suapel_4x30m_652",
            "nombre": "Papel Higiénico Suapel 4x30m (652)",
            "descripcion": "Papel higiénico Suapel paquete de 4 rollos de 30 metros",
            "unidades_por_bulto": 4,
            "descripcion_bulto": "1 bulto = 4 rollos",
            "precio_bulto": 860
          },
          {
            "id": "rollo_cocina_cautiva_3u_654",
            "nombre": "Rollo de Cocina Cautiva 3U (654)",
            "descripcion": "Rollo de cocina Cautiva paquete por 3 unidades",
            "unidades_por_bulto": 3,
            "descripcion_bulto": "1 bulto = 3 unidades",
            "precio_bulto": 910
          },
          {
            "id": "rollo_cocina_suapel_3u_655",
            "nombre": "Rollo de Cocina Suapel 3U (655)",
            "descripcion": "Rollo de cocina Suapel paquete por 3 unidades",
            "unidades_por_bulto": 3,
            "descripcion_bulto": "1 bulto = 3 unidades",
            "precio_bulto": 910
          },
          {
            "id": "rollo_cocina_sussex_3u_656",
            "nombre": "Rollo de Cocina Sussex 3U (656)",
            "descripcion": "Rollo de cocina Sussex paquete por 3 unidades",
            "unidades_por_bulto": 3,
            "descripcion_bulto": "1 bulto = 3 unidades",
            "precio_bulto": 1290
          },
          {
            "id": "suavizante_heroe_900ml_dp_716",
            "nombre": "Suavizante Héroe 900ml D.P (716)",
            "descripcion": "Suavizante para ropa Héroe 900 mililitros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1090
          },
          {
            "id": "suavizante_vivere_3l_dp_clasico_667",
            "nombre": "Suavizante Vivere 3L D.P Clásico (667)",
            "descripcion": "Suavizante para ropa Vivere clásico 3 litros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6000
          },
          {
            "id": "suavizante_vivere_3l_dp_violetas_668",
            "nombre": "Suavizante Vivere 3L D.P Violetas (668)",
            "descripcion": "Suavizante para ropa Vivere violetas 3 litros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 6000
          },
          {
            "id": "suavizante_vivere_900ml_dp_673",
            "nombre": "Suavizante Vivere 900ml D.P (673)",
            "descripcion": "Suavizante para ropa Vivere 900 mililitros (D.P)",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 2000
          },
          {
            "id": "trapo_piso_fibran_clean_48x60_700",
            "nombre": "Trapo de Piso Fibran Clean 48x60 (700)",
            "descripcion": "Trapo de piso Fibran Clean tamaño 48x60 centímetros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 600
          },
          {
            "id": "vanish_quitamanchas_pre_lavado_liquido_400ml_657",
            "nombre": "Vanish Quitamanchas Pre-Lavado Líquido 400ml (657)",
            "descripcion": "Quitamanchas líquido Vanish para prelavado 400 mililitros",
            "unidades_por_bulto": 1,
            "descripcion_bulto": "1 bulto = 1 unidad",
            "precio_bulto": 1400
          }
    ];
}
