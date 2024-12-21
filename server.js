const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit'); // Cambiamos a pdfkit
const app = express();
const ventasPath = path.join(__dirname, 'ventas.json');

const port = 3000;

// Middleware para servir archivos estáticos
app.use(express.static('public'));
app.use(express.json()); // Para parsear el cuerpo de las solicitudes en formato JSON

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Rutas para las categorías
app.get('/cuadros', (req, res) => {
    res.sendFile(__dirname + '/views/cuadros.html');
});

app.get('/tablas', (req, res) => {
    res.sendFile(__dirname + '/views/tablas.html');
});

app.get('/accesorios', (req, res) => {
    res.sendFile(__dirname + '/views/accesorios.html');
});

app.get('/copias', (req, res) => {
    res.sendFile(__dirname + '/views/copias.html');
});

// Ruta para obtener todas las ventas
app.get('/ventas', (req, res) => {
    fs.readFile(ventasPath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('Error al leer las ventas');
        }
        res.json(JSON.parse(data)); // Enviar las ventas como respuesta en formato JSON
    });
});

// Ruta para registrar una venta
app.post('/registro-venta', (req, res) => {
    const { producto, precio, fecha, hora, categoria } = req.body;
    const nuevaVenta = { producto, precio: parseFloat(precio), fecha, hora, categoria };

    console.log('Registrando venta:', nuevaVenta);

    fs.readFile(ventasPath, 'utf-8', (err, data) => {
        const ventas = err ? [] : JSON.parse(data); // Si hay error, iniciamos ventas como array vacío
        ventas.push(nuevaVenta); // Agregar la nueva venta al array

        fs.writeFile(ventasPath, JSON.stringify(ventas, null, 2), (err) => {
            if (err) {
                return res.status(500).send('Error al guardar la venta');
            }
            console.log('Venta guardada en ventas.json');
            res.status(200).send('Venta registrada exitosamente');
        });
    });
});

// Ruta para generar el PDF de las ventas diarias
app.get('/descargar-ventas-diarias', (req, res) => {
    fs.readFile(ventasPath, 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('Error al leer las ventas');
        }

        const ventas = JSON.parse(data);
        const fechaHoy = new Date().toLocaleDateString();

        // Filtrar las ventas de hoy
        const ventasHoy = ventas.filter(venta => venta.fecha === fechaHoy);

        if (ventasHoy.length === 0) {
            return res.status(404).send('No hay ventas registradas hoy');
        }

        // Calcular el total de ventas diarias
        const totalVentas = ventasHoy.reduce((total, venta) => total + venta.precio, 0);

        // Crear el documento PDF
        const doc = new PDFDocument();
        const filePath = path.join(__dirname, `Ventas_Diarias_${fechaHoy.replace(/\//g, '-')}.pdf`);

        // Configurar el encabezado del PDF
        doc.pipe(fs.createWriteStream(filePath));
        doc.text(`Ventas Diarias - ${fechaHoy}`, { align: 'center', underline: true });
        doc.moveDown();

        // Agregar cada venta al PDF
        ventasHoy.forEach((venta, index) => {
            doc.text(`Venta #${index + 1}`);
            doc.text(`Producto: ${venta.producto}`);
            doc.text(`Categoría: ${venta.categoria}`);
            doc.text(`Precio: $${venta.precio}`);
            doc.text(`Hora: ${venta.hora}`);
            doc.text(`Fecha: ${venta.fecha}`);
            doc.moveDown();
        });

        // Agregar el total al final del PDF
        doc.moveDown();
        doc.text(`Total de Ventas del Día: $${totalVentas.toFixed(2)}`, { align: 'right', bold: true });

        doc.end();

        // Enviar el archivo PDF como respuesta
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error al enviar el archivo:', err);
                return res.status(500).send('Error al descargar el archivo');
            }

            // Eliminar el archivo después de enviarlo
            fs.unlinkSync(filePath);
        });
    });
});

// **Nueva Ruta para Resetear Ventas**
app.post('/resetear-ventas', (req, res) => {
    fs.writeFile(ventasPath, JSON.stringify([], null, 2), (err) => {
        if (err) {
            console.error('Error al resetear las ventas:', err);
            return res.status(500).send('Error al resetear las ventas');
        }
        console.log('Ventas reseteadas exitosamente');
        res.status(200).send('Ventas reseteadas exitosamente');
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
