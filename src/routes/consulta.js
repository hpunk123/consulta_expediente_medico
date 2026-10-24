const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { isLoggedIn, checkRole } = require('../lib/auth');
const consultaController = require('../controllers/consultaController');
const Parametro = require('../models/Parametro');

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const rutaDocumentos = await Parametro.getValor('ruta_documentos');
      if (!rutaDocumentos) {
        return cb(new Error('Ruta de documentos no configurada'), null);
      }
      cb(null, rutaDocumentos);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// GET /consulta - Formulario de búsqueda
router.get('/', isLoggedIn, consultaController.showSearch);

// GET /consulta/buscar - Resultados de búsqueda
router.get('/buscar', isLoggedIn, consultaController.search);

// GET /consulta/expediente/:id_eval - Ver expediente completo
router.get('/expediente/:id_eval', isLoggedIn, consultaController.showExpediente);

// GET /consulta/expediente/:id_eval/pdf - Generar PDF
router.get('/expediente/:id_eval/pdf', isLoggedIn, consultaController.generatePDF);

// GET /consulta/documento/:filename - Servir documento PDF
router.get('/documento/:filename', isLoggedIn, async (req, res) => {
  const { filename } = req.params;
  try {
    const rutaDocumentos = await Parametro.getValor('ruta_documentos');
    if (!rutaDocumentos) {
      return res.status(500).json({ error: 'Ruta de documentos no configurada' });
    }
    const filePath = path.join(rutaDocumentos, filename);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: 'Documento no encontrado' });
      }
    });
  } catch (error) {
    console.error('Error al obtener ruta de documentos:', error.message);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// API Tatuajes
// POST /consulta/expediente/:id_eval/tatuajes - Crear tatuaje
router.post('/expediente/:id_eval/tatuajes', isLoggedIn, consultaController.createTatuaje);

// POST /consulta/expediente/:id_eval/tatuajes/observaciones - Guardar observaciones de tatuajes
router.post('/expediente/:id_eval/tatuajes/observaciones', isLoggedIn, consultaController.saveTatuajeObservaciones);

// POST /consulta/expediente/:id_eval/tatuajes/tiene - Actualizar tiene_tatuaje
router.post('/expediente/:id_eval/tatuajes/tiene', isLoggedIn, consultaController.updateTieneTatuaje);

// PUT /consulta/tatuajes/:id - Actualizar tatuaje
router.put('/tatuajes/:id', isLoggedIn, consultaController.updateTatuaje);

// DELETE /consulta/tatuajes/:id - Eliminar tatuaje
router.delete('/tatuajes/:id', isLoggedIn, consultaController.deleteTatuaje);

// API Observaciones Antecedentes
// GET /consulta/expediente/:id_eval/observaciones - Obtener observaciones
router.get('/expediente/:id_eval/observaciones', isLoggedIn, consultaController.getObservaciones);

// POST /consulta/expediente/:id_eval/observaciones - Guardar observación
router.post('/expediente/:id_eval/observaciones', isLoggedIn, consultaController.saveObservacion);

// DELETE /consulta/expediente/:id_eval/observaciones/:seccion - Eliminar observación
router.delete('/expediente/:id_eval/observaciones/:seccion', isLoggedIn, consultaController.deleteObservacion);

// API Antecedentes
// POST /consulta/expediente/:id_eval/datos-generales - Actualizar datos generales
router.post('/expediente/:id_eval/datos-generales', isLoggedIn, consultaController.updateDatosGenerales);

// POST /consulta/expediente/:id_eval/antecedentes/heredo - Actualizar heredo familiares
router.post('/expediente/:id_eval/antecedentes/heredo', isLoggedIn, consultaController.updateHeredo);

// POST /consulta/expediente/:id_eval/antecedentes/nopat - Actualizar no patológicos
router.post('/expediente/:id_eval/antecedentes/nopat', isLoggedIn, consultaController.updateNoPatologicos);

// POST /consulta/expediente/:id_eval/antecedentes/accidentes - Actualizar accidentes
router.post('/expediente/:id_eval/antecedentes/accidentes', isLoggedIn, consultaController.updateAccidentes);

// POST /consulta/expediente/:id_eval/antecedentes/patologicos - Actualizar patológicos
router.post('/expediente/:id_eval/antecedentes/patologicos', isLoggedIn, consultaController.updatePatologicos);

// POST /consulta/expediente/:id_eval/antecedentes/sexual - Actualizar salud sexual
router.post('/expediente/:id_eval/antecedentes/sexual', isLoggedIn, consultaController.updateSexual);

// API Documentos Médicos
// POST /consulta/expediente/:id_eval/documentos - Subir documento
router.post('/expediente/:id_eval/documentos', isLoggedIn, upload.single('file'), consultaController.uploadDocumento);

// DELETE /consulta/expediente/:id_eval/documentos - Eliminar documento
router.delete('/expediente/:id_eval/documentos', isLoggedIn, consultaController.deleteDocumento);

// API Exploración Física
// GET /consulta/expediente/:id_eval/exploracion-fisica - Obtener exploración física
router.get('/expediente/:id_eval/exploracion-fisica', isLoggedIn, consultaController.getExploracionFisica);

// POST /consulta/expediente/:id_eval/exploracion-fisica - Actualizar exploración física
router.post('/expediente/:id_eval/exploracion-fisica', isLoggedIn, consultaController.updateExploracionFisica);

// API Somatometría
// GET /consulta/expediente/:id_eval/somatometria - Obtener somatometría
router.get('/expediente/:id_eval/somatometria', isLoggedIn, consultaController.getSomatometria);

// POST /consulta/expediente/:id_eval/somatometria - Actualizar somatometría
router.post('/expediente/:id_eval/somatometria', isLoggedIn, consultaController.updateSomatometria);

// API Finalizar/Liberar Expediente
const rolesFinalizar = ['administrador', 'director', 'subdirector', 'jefe_departamento', 'supervisor'];

// POST /consulta/expediente/:id_eval/finalizar - Finalizar expediente
router.post('/expediente/:id_eval/finalizar', isLoggedIn, checkRole(rolesFinalizar), consultaController.finalizarExpediente);

// POST /consulta/expediente/:id_eval/liberar - Liberar expediente
router.post('/expediente/:id_eval/liberar', isLoggedIn, checkRole(['administrador', 'director', 'subdirector', 'jefe_departamento']), consultaController.liberarExpediente);

// API SICOC
// GET /consulta/sicoc/verificar/:evalConsecutivo - Verificar evaluación en SICOC
router.get('/sicoc/verificar/:evalConsecutivo', isLoggedIn, consultaController.verificarSicoc);

// POST /consulta/expediente/:id_eval/enlazar-sicoc - Enlazar evaluación a SICOC
router.post('/expediente/:id_eval/enlazar-sicoc', isLoggedIn, consultaController.enlazarSicoc);

module.exports = router;
