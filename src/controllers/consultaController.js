const Expediente = require('../models/Expediente');
const User = require('../models/User');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const pool = require('../database/database');

/**
 * Obtener ruta del navegador (Chrome o Edge)
 */
function getBrowserPath() {
  const possiblePaths = [
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const browserPath of possiblePaths) {
    if (fs.existsSync(browserPath)) {
      return browserPath;
    }
  }

  // Si no encuentra ninguno, retornar undefined (usar Chromium de Puppeteer)
  return undefined;
}

/**
 * Obtener el id_usuario propietario de un expediente
 * Si no tiene propietario, retorna el id del usuario loggeado
 */
async function getUsuarioPropietario(id_eval, id_usuario_actual) {
  const id_propietario = await Expediente.getPropietarioExpediente(id_eval);
  return id_propietario || id_usuario_actual;
}

const consultaController = {
  /**
   * Mostrar formulario de búsqueda
   */
  showSearch(req, res) {
    res.render('consulta/index');
  },

  /**
   * Realizar búsqueda
   */
  async search(req, res) {
    const { nombre } = req.query;

    if (!nombre || nombre.trim() === '') {
      req.flash('error_msg', 'Ingrese un nombre para buscar');
      return res.redirect('/consulta');
    }

    try {
      const resultados = await Expediente.searchByName(nombre);
      res.render('consulta/resultados', { resultados, nombre });
    } catch (error) {
      console.error('Error en búsqueda:', error.message);
      req.flash('error_msg', 'Error al realizar la búsqueda');
      res.redirect('/consulta');
    }
  },

  /**
   * Mostrar expediente
   */
  async showExpediente(req, res) {
    const { id_eval } = req.params;

    try {
      const data = await Expediente.getExpedienteCompleto(id_eval);

      if (!data || !data.evaluado) {
        req.flash('error_msg', 'Evaluación no encontrada');
        return res.redirect('/consulta');
      }

      // Obtener propietario del expediente (o asignar usuario actual)
      const id_usuario_propietario = await getUsuarioPropietario(id_eval, req.user.id_usuario);

      // Auto-sincronizar datos generales desde vlifedb
      await Expediente.syncDatosGenerales(id_eval, data.evaluado, id_usuario_propietario);

      // Recargar datos generales después de sincronizar
      data.datosGenerales = await Expediente.getDatosGenerales(id_eval);

      // Obtener observaciones de antecedentes
      const observaciones = await Expediente.getObservaciones(id_eval);

      // Obtener lista de responsables para finalización
      const responsables = await User.getResponsables();

      res.render('consulta/expediente', { ...data, observaciones, id_usuario_propietario, responsables });
    } catch (error) {
      console.error('Error al cargar expediente:', error.message);
      req.flash('error_msg', 'Error al cargar el expediente');
      res.redirect('/consulta');
    }
  },

  /**
   * Crear tatuaje
   */
  async createTatuaje(req, res) {
    const { id_eval } = req.params;
    const { zona, tamano, descripcion, significado, costo, anio, observaciones } = req.body;

    if (!zona) {
      return res.status(400).json({ error: 'La zona es obligatoria' });
    }

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      
      await Expediente.createTatuaje({
        id_eval,
        zona,
        tamano,
        descripcion,
        significado,
        costo: costo || null,
        anio: anio || null,
        observaciones,
        id_usuario
      });

      res.json({ success: true, message: 'Tatuaje agregado correctamente' });
    } catch (error) {
      console.error('Error al crear tatuaje:', error.message);
      res.status(500).json({ error: 'Error al crear tatuaje' });
    }
  },

  /**
   * Guardar observaciones de tatuajes
   */
  async saveTatuajeObservaciones(req, res) {
    const { id_eval } = req.params;
    const { observaciones } = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.saveTatuajeObservaciones(id_eval, observaciones, id_usuario);
      res.json({ success: true, message: 'Observaciones guardadas correctamente' });
    } catch (error) {
      console.error('Error al guardar observaciones de tatuajes:', error.message);
      res.status(500).json({ error: 'Error al guardar observaciones' });
    }
  },

  /**
   * Actualizar tiene_tatuaje
   */
  async updateTieneTatuaje(req, res) {
    const { id_eval } = req.params;
    const { tiene_tatuaje } = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateTieneTatuaje(id_eval, tiene_tatuaje, id_usuario);
      res.json({ success: true, message: 'Actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar tiene_tatuaje:', error.message);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  },

  /**
   * Actualizar tatuaje
   */
  async updateTatuaje(req, res) {
    const { id } = req.params;
    const { zona, tamano, descripcion, significado, costo, anio, observaciones } = req.body;

    if (!zona) {
      return res.status(400).json({ error: 'La zona es obligatoria' });
    }

    try {
      await Expediente.updateTatuaje(id, {
        zona,
        tamano,
        descripcion,
        significado,
        costo: costo || null,
        anio: anio || null,
        observaciones
      });

      res.json({ success: true, message: 'Tatuaje actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar tatuaje:', error.message);
      res.status(500).json({ error: 'Error al actualizar tatuaje' });
    }
  },

  /**
   * Eliminar tatuaje
   */
  async deleteTatuaje(req, res) {
    const { id } = req.params;

    try {
      await Expediente.deleteTatuaje(id);

      res.json({ success: true, message: 'Tatuaje eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar tatuaje:', error.message);
      res.status(500).json({ error: 'Error al eliminar tatuaje' });
    }
  },

  /**
   * Obtener observaciones de antecedentes
   */
  async getObservaciones(req, res) {
    const { id_eval } = req.params;

    try {
      const observaciones = await Expediente.getObservaciones(id_eval);
      res.json(observaciones);
    } catch (error) {
      console.error('Error al obtener observaciones:', error.message);
      res.status(500).json({ error: 'Error al obtener observaciones' });
    }
  },

  /**
   * Guardar observación de antecedentes
   */
  async saveObservacion(req, res) {
    const { id_eval } = req.params;
    const { seccion, contenido } = req.body;

    const seccionesValidas = ['heredo', 'nopat', 'accidentes', 'patologicos', 'sexual'];

    if (!seccion || !seccionesValidas.includes(seccion)) {
      return res.status(400).json({ error: 'Sección no válida' });
    }

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.saveObservacion(id_eval, seccion, contenido, id_usuario);
      res.json({ success: true, message: 'Observación guardada correctamente' });
    } catch (error) {
      console.error('Error al guardar observación:', error.message);
      res.status(500).json({ error: 'Error al guardar observación' });
    }
  },

  /**
   * Eliminar observación (soft delete)
   */
  async deleteObservacion(req, res) {
    const { id_eval, seccion } = req.params;

    const seccionesValidas = ['heredo', 'nopat', 'accidentes', 'patologicos', 'sexual'];

    if (!seccion || !seccionesValidas.includes(seccion)) {
      return res.status(400).json({ error: 'Sección no válida' });
    }

    try {
      await Expediente.deleteObservacion(id_eval, seccion);
      res.json({ success: true, message: 'Observación eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar observación:', error.message);
      res.status(500).json({ error: 'Error al eliminar observación' });
    }
  },

  /**
   * Actualizar heredo familiares
   */
  async updateHeredo(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateHeredo(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Heredo familiares actualizado' });
    } catch (error) {
      console.error('Error al actualizar heredo:', error.message);
      res.status(500).json({ error: 'Error al actualizar heredo familiares' });
    }
  },

  /**
   * Actualizar no patológicos
   */
  async updateNoPatologicos(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    // Si cuenta_servicios es SI, limpiar especifique_servicios
    if (data.cuenta_servicios === 'SI') {
      data.especifique_servicios = '-';
    }

    // Si actividad_fisica es NO, limpiar veces_semana y tipo_actividad
    if (data.actividad_fisica === 'NO') {
      data.veces_semana = null;
      data.tipo_actividad = '-';
    }

    // Convertir strings vacíos a null para campos numéricos
    if (data.veces_semana === '') data.veces_semana = null;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateNoPatologicos(id_eval, data, id_usuario);
      res.json({ success: true, message: 'No patológicos actualizado' });
    } catch (error) {
      console.error('Error al actualizar no patológicos:', error.message);
      res.status(500).json({ error: 'Error al actualizar no patológicos' });
    }
  },

  /**
   * Actualizar accidentes
   */
  async updateAccidentes(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    // Si accidente_laboral es NO, limpiar campos relacionados
    if (data.accidente_laboral === 'NO') {
      data.accidente_anio = null;
      data.accidente_empresa = '-';
      data.accidente_especifique = '-';
      data.accidente_tratamiento = '-';
      data.accidente_tratamiento_detalle = '-';
      data.formato_rt09 = '-';
    }

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateAccidentes(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Accidentes actualizado' });
    } catch (error) {
      console.error('Error al actualizar accidentes:', error.message);
      res.status(500).json({ error: 'Error al actualizar accidentes' });
    }
  },

  /**
   * Actualizar patológicos
   */
  async updatePatologicos(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    // Si consumo_droga es NO, limpiar campos relacionados
    if (data.consumo_droga === 'NO') {
      data.droga_edad = null;
      data.droga_cuales = '-';
      data.droga_frecuencia = '-';
    }

    // Si consumo_alcohol es NO, limpiar campos relacionados
    if (data.consumo_alcohol === 'NO') {
      data.alcohol_edad = null;
      data.alcohol_tipo = '-';
      data.alcohol_cantidad = '-';
    }

    // Si antecedente_fracturas es NO, limpiar campo relacionado
    if (data.antecedente_fracturas === 'NO') {
      data.fracturas_especifique = '-';
    }

    // Si enfermedad_actual es NO, limpiar campos relacionados
    if (data.enfermedad_actual === 'NO') {
      data.enfermedad_tiempo = '-';
      data.enfermedad_descripcion = '-';
    }

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updatePatologicos(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Patológicos actualizado' });
    } catch (error) {
      console.error('Error al actualizar patológicos:', error.message);
      res.status(500).json({ error: 'Error al actualizar patológicos' });
    }
  },

  /**
   * Actualizar salud sexual
   */
  async updateSexual(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    // Si ets es NO, limpiar campo relacionado
    if (data.ets === 'NO') {
      data.ets_especifique = '-';
    }

    // Si anticonceptivo es NO, limpiar campo relacionado
    if (data.anticonceptivo === 'NO') {
      data.anticonceptivo_especifique = '-';
    }

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateSexual(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Salud sexual actualizado' });
    } catch (error) {
      console.error('Error al actualizar salud sexual:', error.message);
      res.status(500).json({ error: 'Error al actualizar salud sexual' });
    }
  },

  /**
   * Actualizar datos generales
   */
  async updateDatosGenerales(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateDatosGenerales(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Datos generales actualizados' });
    } catch (error) {
      console.error('Error al actualizar datos generales:', error.message);
      res.status(500).json({ error: 'Error al actualizar datos generales' });
    }
  },

  /**
   * Subir documento médico
   */
  async uploadDocumento(req, res) {
    const { id_eval } = req.params;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Debe seleccionar un archivo PDF' });
      }

      const filename = req.file.filename;
      const observaciones = req.body.observaciones || null;
      const tipo_documento = req.body.tipo_documento || null;
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);

      // Desactivar documento anterior (soft delete)
      await Expediente.deleteDocumento(id_eval);

      // Insertar nuevo documento
      await Expediente.createDocumento(id_eval, filename, observaciones, tipo_documento, id_usuario);

      res.json({ success: true, message: 'Documento subido correctamente' });
    } catch (error) {
      console.error('Error al subir documento:', error.message);
      res.status(500).json({ error: 'Error al subir documento' });
    }
  },

  /**
   * Eliminar documento médico
   */
  async deleteDocumento(req, res) {
    const { id_eval } = req.params;

    try {
      await Expediente.deleteDocumento(id_eval);
      res.json({ success: true, message: 'Documento eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar documento:', error.message);
      res.status(500).json({ error: 'Error al eliminar documento' });
    }
  },

  /**
   * Obtener exploración física
   */
  async getExploracionFisica(req, res) {
    const { id_eval } = req.params;

    try {
      const exploracion = await Expediente.getExploracionFisica(id_eval);
      res.json(exploracion || {});
    } catch (error) {
      console.error('Error al obtener exploración física:', error.message);
      res.status(500).json({ error: 'Error al obtener exploración física' });
    }
  },

  /**
   * Actualizar exploración física
   */
  async updateExploracionFisica(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateExploracionFisica(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Exploración física actualizada' });
    } catch (error) {
      console.error('Error al actualizar exploración física:', error.message);
      res.status(500).json({ error: 'Error al actualizar exploración física' });
    }
  },

  /**
   * Obtener somatometría
   */
  async getSomatometria(req, res) {
    const { id_eval } = req.params;

    try {
      const somatometria = await Expediente.getSomatometria(id_eval);
      res.json(somatometria || {});
    } catch (error) {
      console.error('Error al obtener somatometría:', error.message);
      res.status(500).json({ error: 'Error al obtener somatometría' });
    }
  },

  /**
   * Actualizar somatometría
   */
  async updateSomatometria(req, res) {
    const { id_eval } = req.params;
    const data = req.body;

    try {
      const id_usuario = await getUsuarioPropietario(id_eval, req.user.id_usuario);
      await Expediente.updateSomatometria(id_eval, data, id_usuario);
      res.json({ success: true, message: 'Somatometría actualizada' });
    } catch (error) {
      console.error('Error al actualizar somatometría:', error.message);
      res.status(500).json({ error: 'Error al actualizar somatometría' });
    }
  },

  /**
   * Generar PDF
   */
  async generatePDF(req, res) {
    const { id_eval } = req.params;

    try {
      const data = await Expediente.getExpedienteCompleto(id_eval);

      if (!data || !data.evaluado) {
        req.flash('error_msg', 'Evaluación no encontrada');
        return res.redirect('/consulta');
      }

      const html = consultaController.generarHTMLPDF(data);
      
      const browserPath = getBrowserPath();
      const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
      
      // Si encuentra navegador instalado, usarlo; si no, usar Chromium de Puppeteer
      if (browserPath) {
        launchOptions.executablePath = browserPath;
      }
      
      console.log('Generando PDF con navegador:', browserPath || 'Chromium de Puppeteer');
      
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'Letter',
        margin: { top: '0.5cm', right: '0.8cm', bottom: '0.5cm', left: '0.8cm' },
        printBackground: true
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="expediente_${data.evaluado.nombre}_${data.evaluado.anioEval}.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error('Error al generar PDF:', error.message);
      req.flash('error_msg', 'Error al generar el PDF');
      res.redirect(`/consulta/expediente/${id_eval}`);
    }
  },

  /**
   * Finalizar expediente
   */
  async finalizarExpediente(req, res) {
    const { id_eval } = req.params;
    const { id_responsable } = req.body;
    const id_usuario = req.user.id_usuario;

    if (!id_responsable) {
      req.flash('error_msg', 'Debe seleccionar un responsable');
      return res.redirect(`/consulta/expediente/${id_eval}`);
    }

    try {
      const result = await Expediente.finalizarExpediente(id_eval, id_usuario, Number(id_responsable));

      if (result && result.alreadyFinalized) {
        req.flash('error_msg', 'El expediente ya está finalizado');
        return res.redirect(`/consulta/expediente/${id_eval}`);
      }

      req.flash('success_msg', 'Expediente finalizado correctamente');
      res.redirect(`/consulta/expediente/${id_eval}`);
    } catch (error) {
      console.error('Error al finalizar expediente:', error.message);
      req.flash('error_msg', 'Error al finalizar el expediente');
      res.redirect(`/consulta/expediente/${id_eval}`);
    }
  },

  /**
   * Liberar expediente (solo admin)
   */
  async liberarExpediente(req, res) {
    const { id_eval } = req.params;

    try {
      await Expediente.liberarExpediente(id_eval);

      req.flash('success_msg', 'Expediente liberado para edición');
      res.redirect(`/consulta/expediente/${id_eval}`);
    } catch (error) {
      console.error('Error al liberar expediente:', error.message);
      req.flash('error_msg', 'Error al liberar el expediente');
      res.redirect(`/consulta/expediente/${id_eval}`);
    }
  },

  /**
   * Verificar evaluación en SICOC
   */
  async verificarSicoc(req, res) {
    const { evalConsecutivo } = req.params;

    try {
      const resultado = await Expediente.buscarEvaluacionSicoc(evalConsecutivo);

      if (!resultado) {
        return res.json({ success: false, message: 'No se encontró la evaluación en SICOC' });
      }

      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('Error al verificar SICOC:', error.message);
      res.status(500).json({ success: false, message: 'Error al consultar SICOC' });
    }
  },

  /**
   * Enlazar evaluación a SICOC
   */
  async enlazarSicoc(req, res) {
    const { id_eval } = req.params;
    const { evalConsecutivo } = req.body;

    console.log('=== ENLACE SICOC ===');
    console.log('id_eval:', id_eval);
    console.log('evalConsecutivo:', evalConsecutivo);

    try {
      // Verificar si ya existe un enlace activo
      console.log('Verificando enlace existente...');
      const [existing] = await pool.query(
        'SELECT id FROM tbl_enlace_sicoc WHERE id_eval = ? AND eActivo = 1',
        [id_eval]
      );
      console.log('Enlace existente:', existing);

      if (existing) {
        // Actualizar enlace existente
        console.log('Actualizando enlace existente...');
        await pool.query(
          'UPDATE tbl_enlace_sicoc SET evalConsecutivo = ? WHERE id = ?',
          [evalConsecutivo, existing.id]
        );
      } else {
        // Crear nuevo enlace
        console.log('Creando nuevo enlace...');
        await pool.query(
          'INSERT INTO tbl_enlace_sicoc (id_eval, evalConsecutivo, eActivo) VALUES (?, ?, 1)',
          [id_eval, evalConsecutivo]
        );
      }
      
      console.log('Enlace guardado exitosamente');
      res.json({ success: true, message: 'Evaluación enlazada correctamente' });
    } catch (error) {
      console.error('Error al enlazar SICOC:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      res.status(500).json({ success: false, message: 'Error al enlazar evaluación', error: error.message });
    }
  },

  /**
   * Sanitizar HTML para PDF - solo mantiene negritas, subrayado y viñetas
   */
  limpiarHTML(html) {
    if (!html) return 'Sin información';
    // Eliminar estilos inline y clases, mantener solo tags básicos
    let limpio = html
      .replace(/style="[^"]*"/g, '')
      .replace(/class="[^"]*"/g, '')
      .replace(/<div[^>]*>/g, '<p>')
      .replace(/<\/div>/g, '</p>')
      .replace(/<br\s*\/?>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/&nbsp;/g, '')
      .trim();
    return limpio || 'Sin información';
  },

  /**
   * Generar HTML para PDF
   */
  generarHTMLPDF(data) {
    const { evaluado, datosGenerales, antecedentes, tatuajes, tatuajesDetalle, documentos, finalizado, exploracionFisica, somatometria, enlaceSicoc, datosSicoc, observaciones, id_usuario_propietario, clave_evaluador } = data;

    // Crear array de zonas con tatuajes
    const tattooZones = tatuajesDetalle.map(t => t.zona);

    // Leer logo y convertir a base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo_cdmx_2026.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
      console.error('Error reading logo:', err);
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.4; text-transform: uppercase; text-align: justify; }
    .header { background: #9f2241; color: white; padding: 12px 20px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px; }
    .header img { width: 60px; height: 60px; object-fit: contain; }
    .header-text h1 { font-size: 16px; margin-bottom: 2px; }
    .header-text p { font-size: 11px; opacity: 0.9; }
    .content { padding: 8px 20px; }
    .section { margin-bottom: 6px; }
    .section-title { font-size: 14px; font-weight: 700; color: #9f2241; border-bottom: 2px solid #9f2241; padding-bottom: 3px; margin-bottom: 6px; }
    .subsection-title { font-size: 11px; font-weight: 700; color: #9f2241; margin: 4px 0 3px; padding: 3px 6px; background: #f9eef1; border-left: 3px solid #9f2241; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
    .item { padding: 3px 6px; background: #f8f9fa; border-radius: 3px; }
    .label { font-size: 9px; color: #666; margin-bottom: 1px; }
    .value { font-size: 11px; font-weight: 500; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 6px; font-size: 9px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fef2f2; color: #991b1b; }
    .badge-blue { background: #f7dce4; color: #9f2241; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 4px; }
    th { background: #f9eef1; padding: 3px 6px; text-align: left; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 3px 6px; border-bottom: 1px solid #f9eef1; }
    .check { color: #10b981; font-weight: bold; }
    .footer { margin-top: 8px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #666; text-align: center; }
    .body-maps { display: flex; gap: 10px; justify-content: center; margin: 6px 0; }
    .body-map-card { flex: 1; max-width: 200px; }
    .body-map-title { text-align: center; font-weight: 600; font-size: 10px; color: #475569; margin-bottom: 4px; padding: 3px 6px; background: #f9eef1; border-radius: 3px; }
    .human-body-map { width: 100%; height: auto; }
    .human-body-map .body-zone { fill: #e5e7eb; stroke: #475569; stroke-width: 2; }
    .human-body-map .body-zone.has-tattoo { fill: #9f2241; stroke: #771a31; }
    ul, ol { margin: 3px 0 3px 18px; }
    li { margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="CDMX">` : ''}
    <div class="header-text">
      <h1>Expediente Médico CECC SSC CDMX</h1>
      <p>${evaluado.nombre} · ${evaluado.anioEval} · ${evaluado.tipo_eval_desc}</p>
      ${finalizado ? `<p style="margin-top:5px;"><strong>Finalizado:</strong> ${finalizado.fecha_finalizacion}</p>` : ''}
    </div>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-title">Datos Generales</div>
      ${datosGenerales ? `
      <div class="grid">
        <div class="item"><div class="label">Nombre (SICOC)</div><div class="value">${datosSicoc ? (datosSicoc.empNombreCompleto || '-') : '-'}</div></div>
        <div class="item"><div class="label">Número de evaluación</div><div class="value">${enlaceSicoc && enlaceSicoc.evalConsecutivo ? enlaceSicoc.evalConsecutivo : '-'}</div></div>
        <div class="item"><div class="label">Subprograma</div><div class="value">${datosSicoc ? (datosSicoc.spgClave || '-') : '-'}</div></div>
        <div class="item"><div class="label">No. Empleado (SICOC)</div><div class="value">${datosSicoc ? (datosSicoc.evalNumEmpleado || '-') : '-'}</div></div>
        <div class="item"><div class="label">Cargo</div><div class="value">${datosSicoc ? (datosSicoc.cgCargo || '-') : '-'}</div></div>
        <div class="item"><div class="label">Adscripción</div><div class="value">${datosSicoc ? (datosSicoc.evalAdscripcion || '-') : '-'}</div></div>
        <div class="item"><div class="label">Género</div><div class="value">${datosGenerales.genero || '-'}</div></div>
        <div class="item"><div class="label">RFC</div><div class="value">${datosGenerales.rfc || '-'}</div></div>
        <div class="item"><div class="label">Fecha Nacimiento</div><div class="value">${datosGenerales.fecha_nacimiento || '-'}</div></div>
        <div class="item"><div class="label">Edad</div><div class="value">${datosGenerales.edad || '-'}</div></div>
        <div class="item"><div class="label">Escolaridad</div><div class="value">${datosGenerales.escolaridad || '-'}</div></div>
        <div class="item"><div class="label">Estado Civil</div><div class="value">${datosGenerales.estado_civil || '-'}</div></div>
        <div class="item"><div class="label">Teléfono</div><div class="value">${datosGenerales.telefono_celular || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
    </div>

    <div class="section">
      <div class="section-title">Historia Clínica</div>
      
      <div class="subsection-title">HEREDO FAMILIARES</div>
      ${antecedentes.heredo ? `
      <table>
        <thead>
          <tr>
            <th>Enfermedad</th>
            <th>Padre</th>
            <th>Madre</th>
            <th>Abuelos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-red">Hipertensión</span></td>
            <td>${antecedentes.heredo.enf_hipertension_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_hipertension_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_hipertension_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">Diabetes</span></td>
            <td>${antecedentes.heredo.enf_diabetes_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_diabetes_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_diabetes_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">Cardíacas</span></td>
            <td>${antecedentes.heredo.enf_cardiacas_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_cardiacas_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_cardiacas_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">Artritis</span></td>
            <td>${antecedentes.heredo.enf_artritis_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_artritis_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_artritis_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">Psiquiátricas</span></td>
            <td>${antecedentes.heredo.enf_psiquiatricas_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_psiquiatricas_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_psiquiatricas_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">Epilepsia</span></td>
            <td>${antecedentes.heredo.enf_epilepsia_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_epilepsia_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_epilepsia_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-blue">Tiroideas</span></td>
            <td>${antecedentes.heredo.enf_tiroideas_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_tiroideas_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_tiroideas_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">Cáncer</span></td>
            <td>${antecedentes.heredo.enf_cancer_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_cancer_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_cancer_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          ${antecedentes.heredo.enf_otros || antecedentes.heredo.enf_otros_padre || antecedentes.heredo.enf_otros_madre || antecedentes.heredo.enf_otros_abuelos || antecedentes.heredo.enf_otros_detalle ? `
          <tr>
            <td><span class="badge badge-blue">OTROS:</span> ${antecedentes.heredo.enf_otros_detalle || ''}</td>
            <td>${antecedentes.heredo.enf_otros_padre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_otros_madre ? '<span class="check">✓</span>' : '-'}</td>
            <td>${antecedentes.heredo.enf_otros_abuelos ? '<span class="check">✓</span>' : '-'}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      ` : '<p>Sin datos registrados</p>'}
      ${observaciones && observaciones.heredo ? `
      <div style="margin-top:4px;">
        <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Observaciones Heredo Familiares</div>
        <div class="value" style="padding:3px 6px;">${this.limpiarHTML(observaciones.heredo)}</div>
      </div>
      ` : ''}

      <div class="subsection-title">PERSONALES NO PATOLÓGICOS</div>
      ${antecedentes.noPat ? `
      <div class="grid">
        <div class="item"><div class="label">Tipo Domicilio</div><div class="value">${antecedentes.noPat.tipo_domicilio || '-'}</div></div>
        <div class="item"><div class="label">Cuenta con Servicios</div><div class="value">${antecedentes.noPat.cuenta_servicios || '-'}</div></div>
        <div class="item"><div class="label">Especifique Servicios</div><div class="value">${antecedentes.noPat.especifique_servicios || '-'}</div></div>
        <div class="item"><div class="label">Cambio de Ropa</div><div class="value">${antecedentes.noPat.cambio_ropa || '-'}</div></div>
        <div class="item"><div class="label">Baño Diario</div><div class="value">${antecedentes.noPat.bano_diario || '-'}</div></div>
        <div class="item"><div class="label">Ingesta de Agua</div><div class="value">${antecedentes.noPat.ingesta_agua || '-'}</div></div>
        <div class="item"><div class="label">Actividad Física</div><div class="value">${antecedentes.noPat.actividad_fisica || '-'}</div></div>
        <div class="item"><div class="label">Veces por Semana</div><div class="value">${antecedentes.noPat.veces_semana || '-'}</div></div>
        <div class="item"><div class="label">Tipo de Actividad</div><div class="value">${antecedentes.noPat.tipo_actividad || '-'}</div></div>
        <div class="item"><div class="label">Horas de Sueño</div><div class="value">${antecedentes.noPat.horas_sueno || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
      ${observaciones && observaciones.nopat ? `
      <div style="margin-top:4px;">
        <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Observaciones Personales No Patológicos</div>
        <div class="value" style="padding:3px 6px;">${this.limpiarHTML(observaciones.nopat)}</div>
      </div>
      ` : ''}

      <div class="subsection-title">ACCIDENTES LABORALES</div>
      ${antecedentes.accidentes ? `
      <div class="grid">
        <div class="item"><div class="label">¿Ha tenido accidentes laborales?</div><div class="value">${antecedentes.accidentes.accidente_laboral || '-'}</div></div>
        <div class="item"><div class="label">Año del Accidente</div><div class="value">${antecedentes.accidentes.accidente_anio || '-'}</div></div>
        <div class="item"><div class="label">Empresa</div><div class="value">${antecedentes.accidentes.accidente_empresa || '-'}</div></div>
        <div class="item" style="grid-column: span 2;"><div class="label">Especifique</div><div class="value">${antecedentes.accidentes.accidente_especifique || '-'}</div></div>
        <div class="item"><div class="label">¿Recibió tratamiento?</div><div class="value">${antecedentes.accidentes.accidente_tratamiento || '-'}</div></div>
        <div class="item"><div class="label">Detalle Tratamiento</div><div class="value">${antecedentes.accidentes.accidente_tratamiento_detalle || '-'}</div></div>
        <div class="item"><div class="label">Formato RT09</div><div class="value">${antecedentes.accidentes.formato_rt09 || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
      ${observaciones && observaciones.accidentes ? `
      <div style="margin-top:4px;">
        <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Observaciones Accidentes Laborales</div>
        <div class="value" style="padding:3px 6px;">${this.limpiarHTML(observaciones.accidentes)}</div>
      </div>
      ` : ''}

      <div class="subsection-title">PERSONALES PATOLÓGICOS</div>
      ${antecedentes.patologicos ? `
      <div class="grid">
        <div class="item"><div class="label">Consumo de Drogas</div><div class="value">${antecedentes.patologicos.consumo_droga || '-'}</div></div>
        <div class="item"><div class="label">Edad Inicio Drogas</div><div class="value">${antecedentes.patologicos.droga_edad ? antecedentes.patologicos.droga_edad + ' años' : '-'}</div></div>
        <div class="item"><div class="label">¿Cuáles drogas?</div><div class="value">${antecedentes.patologicos.droga_cuales || '-'}</div></div>
        <div class="item"><div class="label">Frecuencia Drogas</div><div class="value">${antecedentes.patologicos.droga_frecuencia || '-'}</div></div>
        <div class="item"><div class="label">Consumo de Alcohol</div><div class="value">${antecedentes.patologicos.consumo_alcohol || '-'}</div></div>
        <div class="item"><div class="label">Edad Inicio Alcohol</div><div class="value">${antecedentes.patologicos.alcohol_edad ? antecedentes.patologicos.alcohol_edad + ' años' : '-'}</div></div>
        <div class="item"><div class="label">Tipo de Alcohol</div><div class="value">${antecedentes.patologicos.alcohol_tipo || '-'}</div></div>
        <div class="item"><div class="label">Cantidad Alcohol</div><div class="value">${antecedentes.patologicos.alcohol_cantidad || '-'}</div></div>
        <div class="item"><div class="label">Antecedente Fracturas</div><div class="value">${antecedentes.patologicos.antecedente_fracturas || '-'}</div></div>
        <div class="item"><div class="label">Especifique Fracturas</div><div class="value">${antecedentes.patologicos.fracturas_especifique || '-'}</div></div>
        <div class="item"><div class="label">Enfermedad Actual</div><div class="value">${antecedentes.patologicos.enfermedad_actual || '-'}</div></div>
        <div class="item"><div class="label">Tiempo Enfermedad</div><div class="value">${antecedentes.patologicos.enfermedad_tiempo || '-'}</div></div>
        <div class="item" style="grid-column: span 2;"><div class="label">Descripción Enfermedad</div><div class="value">${antecedentes.patologicos.enfermedad_descripcion || '-'}</div></div>
        <div class="item"><div class="label">¿Consume medicamentos?</div><div class="value">${antecedentes.patologicos.consume_medicamentos || '-'}</div></div>
        <div class="item" style="grid-column: span 2;"><div class="label">Describa los medicamentos</div><div class="value">${antecedentes.patologicos.medicamentos_descripcion || '-'}</div></div>
        <div class="item"><div class="label">¿Tiene alergias?</div><div class="value">${antecedentes.patologicos.tiene_alergias || '-'}</div></div>
        <div class="item" style="grid-column: span 2;"><div class="label">Describa las alergias</div><div class="value">${antecedentes.patologicos.alergias_descripcion || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
      ${observaciones && observaciones.patologicos ? `
      <div style="margin-top:4px;">
        <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Observaciones Personales Patológicos</div>
        <div class="value" style="padding:3px 6px;">${this.limpiarHTML(observaciones.patologicos)}</div>
      </div>
      ` : ''}
      ${antecedentes.patologicos && antecedentes.patologicos.ant_ninguno ? `
      <div style="margin-top:4px;padding:4px;background:#f8f9fa;border-radius:3px;">
        <div class="label" style="font-weight:600;">Antecedentes Patológicos Adicionales</div>
        <div class="value">Ninguno</div>
      </div>
      ` : ''}
      ${antecedentes.patologicos && !antecedentes.patologicos.ant_ninguno && (antecedentes.patologicos.ant_traumatologico || antecedentes.patologicos.ant_medicamentos_controlados || antecedentes.patologicos.ant_cardiorespiratorias || antecedentes.patologicos.ant_endocrinologicas || antecedentes.patologicos.ant_musculo_esqueleticas || antecedentes.patologicos.ant_otros) ? `
      <div style="margin-top:4px;">
        <div class="subsection-title">Antecedentes Patológicos Adicionales</div>
        ${antecedentes.patologicos.ant_traumatologico ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Antecedentes traumatólogicos o quirúrgicos</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_traumatologico_obs ? this.limpiarHTML(antecedentes.patologicos.ant_traumatologico_obs) : 'SI'}</div>
        </div>` : ''}
        ${antecedentes.patologicos.ant_medicamentos_controlados ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Consumo de medicamentos controlados</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_medicamentos_controlados_obs ? this.limpiarHTML(antecedentes.patologicos.ant_medicamentos_controlados_obs) : 'SI'}</div>
        </div>` : ''}
        ${antecedentes.patologicos.ant_cardiorespiratorias ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Enfermedades y alteraciones cardiorespiratorias</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_cardiorespiratorias_obs ? this.limpiarHTML(antecedentes.patologicos.ant_cardiorespiratorias_obs) : 'SI'}</div>
        </div>` : ''}
        ${antecedentes.patologicos.ant_endocrinologicas ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Enfermedades endocrinológicas</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_endocrinologicas_obs ? this.limpiarHTML(antecedentes.patologicos.ant_endocrinologicas_obs) : 'SI'}</div>
        </div>` : ''}
        ${antecedentes.patologicos.ant_musculo_esqueleticas ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Alteraciones músculo esqueléticas</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_musculo_esqueleticas_obs ? this.limpiarHTML(antecedentes.patologicos.ant_musculo_esqueleticas_obs) : 'SI'}</div>
        </div>` : ''}
        ${antecedentes.patologicos.ant_otros ? `
        <div style="margin-bottom:3px;">
          <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Otros</div>
          <div class="value" style="padding:3px 6px;">${antecedentes.patologicos.ant_otros_obs ? this.limpiarHTML(antecedentes.patologicos.ant_otros_obs) : 'SI'}</div>
        </div>` : ''}
      </div>
      ` : ''}

      <div class="subsection-title">SALUD SEXUAL</div>
      ${antecedentes.sexual ? `
      <div class="grid">
        <div class="item"><div class="label">Inicio Vida Sexual</div><div class="value">${antecedentes.sexual.edad_inicio_sexual ? antecedentes.sexual.edad_inicio_sexual + ' años' : '-'}</div></div>
        <div class="item"><div class="label">Número de Parejas</div><div class="value">${antecedentes.sexual.num_parejas || '-'}</div></div>
        <div class="item"><div class="label">ETS</div><div class="value">${antecedentes.sexual.ets || '-'}</div></div>
        <div class="item"><div class="label">Especifique ETS</div><div class="value">${antecedentes.sexual.ets_especifique || '-'}</div></div>
        <div class="item"><div class="label">Método Anticonceptivo</div><div class="value">${antecedentes.sexual.anticonceptivo || '-'}</div></div>
        <div class="item"><div class="label">Especifique Anticonceptivo</div><div class="value">${antecedentes.sexual.anticonceptivo_especifique || '-'}</div></div>
        <div class="item"><div class="label">Última Menstruación</div><div class="value">${antecedentes.sexual.ultima_menstruacion || '-'}</div></div>
        <div class="item"><div class="label">Frecuencia Menstrual</div><div class="value">${antecedentes.sexual.frecuencia_menstrual || '-'}</div></div>
        <div class="item"><div class="label">Número de Partos</div><div class="value">${antecedentes.sexual.num_partos || '-'}</div></div>
        <div class="item"><div class="label">Número de Cesáreas</div><div class="value">${antecedentes.sexual.num_cesareas || '-'}</div></div>
        <div class="item"><div class="label">Número de Abortos</div><div class="value">${antecedentes.sexual.num_abortos || '-'}</div></div>
        <div class="item" style="grid-column: span 2;"><div class="label">Observaciones</div><div class="value">${antecedentes.sexual.observaciones_sexual || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
      ${observaciones && observaciones.sexual ? `
      <div style="margin-top:4px;">
        <div class="label" style="font-weight:600;padding:3px 6px;background:#fdf1f4;border-left:3px solid #9f2241;">Observaciones Salud Sexual</div>
        <div class="value" style="padding:3px 6px;">${this.limpiarHTML(observaciones.sexual)}</div>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <div class="section-title">EXPLORACIÓN FÍSICA</div>
      
      <div class="subsection-title">INTERROGATORIO POR APARATOS Y SISTEMAS</div>
      ${exploracionFisica ? `
        ${exploracionFisica.sin_datos ? `
          <p style="margin-bottom:8px;"><strong>Sin datos de relevancia</strong></p>
        ` : `
          ${exploracionFisica.cardiorespiratorio ? `
            <div class="subsection-title">Aparato Cardiorrespiratorio</div>
            <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.cardiorespiratorio_obs)}</div>
          ` : ''}
          ${exploracionFisica.endocrino ? `
            <div class="subsection-title">Aparato Endócrino</div>
            <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.endocrino_obs)}</div>
          ` : ''}
          ${exploracionFisica.osteomuscular ? `
            <div class="subsection-title">Aparato Osteomuscular</div>
            <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.osteomuscular_obs)}</div>
          ` : ''}
          ${exploracionFisica.neuropsiquiatrico ? `
            <div class="subsection-title">Sistema Neuropsiquiátrico</div>
            <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.neuropsiquiatrico_obs)}</div>
          ` : ''}
          ${exploracionFisica.otros ? `
            <div class="subsection-title">Otros</div>
            <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.otros_obs)}</div>
          ` : ''}
        `}
        <div class="subsection-title">HABITUS EXTERIOR</div>
        <div style="margin-bottom:8px;padding:6px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(exploracionFisica.habitus_exterior)}</div>
      ` : '<p>Sin datos registrados</p>'}
    </div>

    <div class="section">
      <div class="section-title">Tatuajes</div>
      ${tatuajes ? `<p style="margin-bottom:10px;"><strong>¿Tiene tatuajes?</strong> ${tatuajes.tiene_tatuaje}</p>` : ''}
      ${tatuajes?.observaciones ? `<p style="margin-bottom:10px;"><strong>Observaciones:</strong> ${tatuajes.observaciones}</p>` : ''}
      
      ${tatuajesDetalle.length > 0 ? `
      <div class="body-maps">
        <div class="body-map-card">
          <div class="body-map-title">FRONTAL</div>
          <svg class="human-body-map" viewBox="0 0 600 1200" xmlns="http://www.w3.org/2000/svg">
            <g id="cabeza">
              <path class="body-zone${tattooZones.includes('region_facial_derecha') ? ' has-tattoo' : ''}" d="M300 64 C263 64 240 90 240 130 C240 171 261 201 300 211 Z"/>
              <path class="body-zone${tattooZones.includes('region_facial_izquierda') ? ' has-tattoo' : ''}" d="M300 64 C337 64 360 90 360 130 C360 171 339 201 300 211 Z"/>
            </g>
            <g id="cuello">
              <path class="body-zone${tattooZones.includes('cuello_derecho') ? ' has-tattoo' : ''}" d="M300 211 L270 206 L263 251 L300 270 Z"/>
              <path class="body-zone${tattooZones.includes('cuello_izquierdo') ? ' has-tattoo' : ''}" d="M300 211 L330 206 L337 251 L300 270 Z"/>
            </g>
            <g id="torso">
              <path class="body-zone${tattooZones.includes('pectoral_derecho') ? ' has-tattoo' : ''}" d="M300 270 L257 250 C230 258 215 282 211 329 L300 345 Z"/>
              <path class="body-zone${tattooZones.includes('pectoral_izquierdo') ? ' has-tattoo' : ''}" d="M300 270 L343 250 C370 258 385 282 389 329 L300 345 Z"/>
              <path class="body-zone${tattooZones.includes('region_costal_derecha') ? ' has-tattoo' : ''}" d="M211 329 L300 345 L300 424 L222 414 C216 387 212 356 211 329 Z"/>
              <path class="body-zone${tattooZones.includes('region_costal_izquierda') ? ' has-tattoo' : ''}" d="M389 329 L300 345 L300 424 L378 414 C384 387 388 356 389 329 Z"/>
              <path class="body-zone${tattooZones.includes('abdomen_derecho') ? ' has-tattoo' : ''}" d="M222 414 L300 424 L300 538 L236 526 C229 489 224 449 222 414 Z"/>
              <path class="body-zone${tattooZones.includes('abdomen_izquierdo') ? ' has-tattoo' : ''}" d="M378 414 L300 424 L300 538 L364 526 C371 489 376 449 378 414 Z"/>
              <path class="body-zone${tattooZones.includes('region_suprapubica') ? ' has-tattoo' : ''}" d="M250 526 L300 538 L350 526 L343 590 L300 615 L257 590 Z"/>
            </g>
            <g id="extremidad_superior_derecha">
              <path class="body-zone${tattooZones.includes('region_deltoidea_derecha') ? ' has-tattoo' : ''}" d="M257 250 C223 244 190 260 176 293 L211 329 C218 287 231 263 257 250 Z"/>
              <path class="body-zone${tattooZones.includes('brazo_derecho') ? ' has-tattoo' : ''}" d="M176 293 C159 327 151 369 147 418 L190 425 C195 388 202 353 211 329 Z"/>
              <path class="body-zone${tattooZones.includes('antebrazo_derecho') ? ' has-tattoo' : ''}" d="M147 418 C141 469 133 517 122 558 L168 570 C179 519 186 471 190 425 Z"/>
              <path class="body-zone${tattooZones.includes('palma_derecha') ? ' has-tattoo' : ''}" d="M122 558 C107 563 98 579 101 597 L109 644 C111 657 125 664 137 656 L159 638 C169 630 173 614 168 570 Z"/>
            </g>
            <g id="extremidad_superior_izquierda">
              <path class="body-zone${tattooZones.includes('region_deltoidea_izquierda') ? ' has-tattoo' : ''}" d="M343 250 C377 244 410 260 424 293 L389 329 C382 287 369 263 343 250 Z"/>
              <path class="body-zone${tattooZones.includes('brazo_izquierdo') ? ' has-tattoo' : ''}" d="M424 293 C441 327 449 369 453 418 L410 425 C405 388 398 353 389 329 Z"/>
              <path class="body-zone${tattooZones.includes('antebrazo_izquierdo') ? ' has-tattoo' : ''}" d="M453 418 C459 469 467 517 478 558 L432 570 C421 519 414 471 410 425 Z"/>
              <path class="body-zone${tattooZones.includes('palma_izquierda') ? ' has-tattoo' : ''}" d="M478 558 C493 563 502 579 499 597 L491 644 C489 657 475 664 463 656 L441 638 C431 630 427 614 432 570 Z"/>
            </g>
            <g id="extremidad_inferior_derecha">
              <path class="body-zone${tattooZones.includes('region_coxal_derecha') ? ' has-tattoo' : ''}" d="M236 526 L250 526 L257 590 L300 615 L300 650 L234 634 C224 602 225 560 236 526 Z"/>
              <path class="body-zone${tattooZones.includes('muslo_derecho') ? ' has-tattoo' : ''}" d="M234 634 L300 650 L294 817 L239 817 C230 756 228 690 234 634 Z"/>
              <path class="body-zone${tattooZones.includes('rodilla_derecha') ? ' has-tattoo' : ''}" d="M239 817 L294 817 L291 874 L243 874 Z"/>
              <path class="body-zone${tattooZones.includes('pierna_derecha') ? ' has-tattoo' : ''}" d="M243 874 L291 874 L284 1045 L252 1045 C245 989 242 931 243 874 Z"/>
              <path class="body-zone${tattooZones.includes('tobillo_derecho') ? ' has-tattoo' : ''}" d="M252 1045 L284 1045 L282 1091 L254 1091 Z"/>
              <path class="body-zone${tattooZones.includes('dorso_pie_derecho') ? ' has-tattoo' : ''}" d="M254 1091 L282 1091 L300 1134 C304 1147 294 1158 279 1158 L213 1158 C200 1158 195 1145 205 1137 Z"/>
            </g>
            <g id="extremidad_inferior_izquierda">
              <path class="body-zone${tattooZones.includes('region_coxal_izquierda') ? ' has-tattoo' : ''}" d="M364 526 L350 526 L343 590 L300 615 L300 650 L366 634 C376 602 375 560 364 526 Z"/>
              <path class="body-zone${tattooZones.includes('muslo_izquierdo') ? ' has-tattoo' : ''}" d="M366 634 L300 650 L306 817 L361 817 C370 756 372 690 366 634 Z"/>
              <path class="body-zone${tattooZones.includes('rodilla_izquierda') ? ' has-tattoo' : ''}" d="M361 817 L306 817 L309 874 L357 874 Z"/>
              <path class="body-zone${tattooZones.includes('pierna_izquierda') ? ' has-tattoo' : ''}" d="M357 874 L309 874 L316 1045 L348 1045 C355 989 358 931 357 874 Z"/>
              <path class="body-zone${tattooZones.includes('tobillo_izquierdo') ? ' has-tattoo' : ''}" d="M348 1045 L316 1045 L318 1091 L346 1091 Z"/>
              <path class="body-zone${tattooZones.includes('dorso_pie_izquierdo') ? ' has-tattoo' : ''}" d="M346 1091 L318 1091 L300 1134 C296 1147 306 1158 321 1158 L387 1158 C400 1158 405 1145 395 1137 Z"/>
            </g>
          </svg>
        </div>
        <div class="body-map-card">
          <div class="body-map-title">POSTERIOR</div>
          <svg class="human-body-map" viewBox="0 0 600 1200" xmlns="http://www.w3.org/2000/svg">
            <g id="cabeza_posterior">
              <path class="body-zone${tattooZones.includes('region_occipital_izquierda') ? ' has-tattoo' : ''}" d="M300 64 C267 64 242 86 240 124 C238 162 258 194 300 208 Z"/>
              <path class="body-zone${tattooZones.includes('region_occipital_derecha') ? ' has-tattoo' : ''}" d="M300 64 C333 64 358 86 360 124 C362 162 342 194 300 208 Z"/>
            </g>
            <g id="cuello_posterior">
              <path class="body-zone${tattooZones.includes('cuello_post_izquierdo') ? ' has-tattoo' : ''}" d="M300 208 L270 202 C270 219 267 238 260 255 L300 274 Z"/>
              <path class="body-zone${tattooZones.includes('cuello_post_derecho') ? ' has-tattoo' : ''}" d="M300 208 L330 202 C330 219 333 238 340 255 L300 274 Z"/>
            </g>
            <g id="regiones_escapulares">
              <path class="body-zone${tattooZones.includes('region_escapular_izquierda') ? ' has-tattoo' : ''}" d="M260 255 C232 255 207 268 190 292 L210 353 C222 378 251 388 271 369 C284 356 287 324 300 294 L300 274 Z"/>
              <path class="body-zone${tattooZones.includes('region_escapular_derecha') ? ' has-tattoo' : ''}" d="M340 255 C368 255 393 268 410 292 L390 353 C378 378 349 388 329 369 C316 356 313 324 300 294 L300 274 Z"/>
            </g>
            <g id="extremidad_superior_izquierda_post">
              <path class="body-zone${tattooZones.includes('brazo_post_izquierdo') ? ' has-tattoo' : ''}" d="M410 292 C432 320 442 368 447 425 L404 430 C398 384 393 341 390 353 Z"/>
              <path class="body-zone${tattooZones.includes('antebrazo_post_izquierdo') ? ' has-tattoo' : ''}" d="M404 430 C413 485 422 533 438 584 L482 575 C470 525 461 475 447 425 Z"/>
              <path class="body-zone${tattooZones.includes('dorso_mano_izquierda') ? ' has-tattoo' : ''}" d="M438 584 C450 612 457 638 458 671 L493 667 C497 637 492 608 482 575 Z"/>
            </g>
            <g id="extremidad_superior_derecha_post">
              <path class="body-zone${tattooZones.includes('brazo_post_derecho') ? ' has-tattoo' : ''}" d="M190 292 C168 320 158 368 153 425 L196 430 C202 384 207 341 210 353 Z"/>
              <path class="body-zone${tattooZones.includes('antebrazo_post_derecho') ? ' has-tattoo' : ''}" d="M196 430 C187 485 178 533 162 584 L118 575 C130 525 139 475 153 425 Z"/>
              <path class="body-zone${tattooZones.includes('dorso_mano_derecha') ? ' has-tattoo' : ''}" d="M162 584 C150 612 143 638 142 671 L107 667 C103 637 108 608 118 575 Z"/>
            </g>
            <g id="espalda">
              <path class="body-zone${tattooZones.includes('region_dorsal_izquierda') ? ' has-tattoo' : ''}" d="M300 274 C334 290 359 333 372 405 C378 445 380 480 380 540 L300 540 Z"/>
              <path class="body-zone${tattooZones.includes('region_dorsal_derecha') ? ' has-tattoo' : ''}" d="M300 274 C266 290 241 333 228 405 C222 445 220 480 220 540 L300 540 Z"/>
              <path class="body-zone${tattooZones.includes('region_lumbar') ? ' has-tattoo' : ''}" d="M220 540 L380 540 L366 618 L234 618 Z"/>
            </g>
            <g id="regiones_gluteas">
              <path class="body-zone${tattooZones.includes('region_glutea_izquierda') ? ' has-tattoo' : ''}" d="M300 618 L366 618 C378 632 384 655 381 681 C377 718 351 742 316 738 C307 736 302 730 300 722 Z"/>
              <path class="body-zone${tattooZones.includes('region_glutea_derecha') ? ' has-tattoo' : ''}" d="M300 618 L234 618 C222 632 216 655 219 681 C223 718 249 742 284 738 C293 736 298 730 300 722 Z"/>
            </g>
            <g id="muslos_posteriores">
              <path class="body-zone${tattooZones.includes('muslo_post_izquierdo') ? ' has-tattoo' : ''}" d="M316 738 C340 742 361 750 372 770 C370 821 366 870 360 918 L311 918 C307 866 304 808 304 751 C306 744 310 740 316 738 Z"/>
              <path class="body-zone${tattooZones.includes('muslo_post_derecho') ? ' has-tattoo' : ''}" d="M284 738 C260 742 239 750 228 770 C230 821 234 870 240 918 L289 918 C293 866 296 808 296 751 C294 744 290 740 284 738 Z"/>
            </g>
            <g id="regiones_popliteas">
              <path class="body-zone${tattooZones.includes('region_poplitea_izquierda') ? ' has-tattoo' : ''}" d="M311 918 L360 918 L357 973 L315 973 Z"/>
              <path class="body-zone${tattooZones.includes('region_poplitea_derecha') ? ' has-tattoo' : ''}" d="M289 918 L240 918 L243 973 L285 973 Z"/>
            </g>
            <g id="piernas_posteriores">
              <path class="body-zone${tattooZones.includes('pierna_post_izquierda') ? ' has-tattoo' : ''}" d="M315 973 L357 973 C356 1022 352 1068 346 1107 L320 1107 C317 1064 315 1018 315 973 Z"/>
              <path class="body-zone${tattooZones.includes('pierna_post_derecha') ? ' has-tattoo' : ''}" d="M285 973 L243 973 C244 1022 248 1068 254 1107 L280 1107 C283 1064 285 1018 285 973 Z"/>
            </g>
            <g id="tobillos_posteriores">
              <path class="body-zone${tattooZones.includes('tobillo_post_izquierdo') ? ' has-tattoo' : ''}" d="M320 1107 L346 1107 L345 1141 L321 1141 Z"/>
              <path class="body-zone${tattooZones.includes('tobillo_post_derecho') ? ' has-tattoo' : ''}" d="M280 1107 L254 1107 L255 1141 L279 1141 Z"/>
            </g>
            <g id="talones">
              <path class="body-zone${tattooZones.includes('talon_izquierdo') ? ' has-tattoo' : ''}" d="M321 1141 L345 1141 C354 1148 360 1157 360 1167 C360 1177 352 1185 340 1185 L320 1185 C312 1185 307 1179 308 1171 C309 1160 314 1149 321 1141 Z"/>
              <path class="body-zone${tattooZones.includes('talon_derecho') ? ' has-tattoo' : ''}" d="M279 1141 L255 1141 C246 1148 240 1157 240 1167 C240 1177 248 1185 260 1185 L280 1185 C288 1185 293 1179 292 1171 C291 1160 286 1149 279 1141 Z"/>
            </g>
          </svg>
        </div>
      </div>
      ` : ''}

      ${tatuajesDetalle.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Zona</th>
            <th>Tamaño</th>
            <th>Descripción</th>
            <th>Significado</th>
            <th>Costo</th>
            <th>Año</th>
          </tr>
        </thead>
        <tbody>
          ${tatuajesDetalle.map((t, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${t.zona}</td>
            <td>${(() => { const map = {'PEQUEÑO': '<10 cm', 'MEDIANO': '10-20 cm', 'GRANDE': '20-40 cm', 'MUY_GRANDE': '>40 cm'}; return map[t.tamano] || t.tamano || '-'; })()}</td>
            <td>${t.descripcion}</td>
            <td>${t.significado || '-'}</td>
            <td>${t.costo ? '$' + t.costo : '-'}</td>
            <td>${t.anio || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p>Sin tatuajes registrados</p>'}
    </div>

    <div class="section">
      <div class="section-title">SOMATOMETRÍA</div>
      ${somatometria ? `
      <div class="grid">
        <div class="item"><div class="label">Peso (kg)</div><div class="value">${somatometria.peso || '-'}</div></div>
        <div class="item"><div class="label">Talla (m)</div><div class="value">${somatometria.talla || '-'}</div></div>
        <div class="item"><div class="label">IMC (kg/m²)</div><div class="value">${somatometria.imc || '-'}</div></div>
        ${somatometria.imc ? (() => {
          const imc = parseFloat(somatometria.imc);
          let categoria, rango;
          if (imc < 18.5) { categoria = 'Peso bajo'; rango = '< 18.5'; }
          else if (imc < 25) { categoria = 'Peso normal'; rango = '18.5 - 24.99'; }
          else if (imc < 30) { categoria = 'Sobrepeso'; rango = '25 - 29.99'; }
          else if (imc < 35) { categoria = 'Obesidad grado I'; rango = '30 - 34.99'; }
          else if (imc < 40) { categoria = 'Obesidad grado II'; rango = '35 - 39.99'; }
          else { categoria = 'Obesidad grado III'; rango = '≥ 40'; }
          return `<div class="item" style="grid-column: span 2;"><div class="label">Clasificación IMC</div><div class="value">${rango} - ${categoria}</div></div>`;
        })() : ''}
      </div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    <div class="section">
      <div class="section-title">ESTADO NUTRICIONAL</div>
      ${somatometria && somatometria.estado_nutricional ? `
      <div style="padding:4px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(somatometria.estado_nutricional)}</div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    <div class="section">
      <div class="section-title">SIGNOS VITALES</div>
      ${somatometria ? `
      <div class="grid">
        <div class="item"><div class="label">Presión Arterial (mmHg)</div><div class="value">${somatometria.presion_arterial || '-'}</div></div>
        <div class="item"><div class="label">Frecuencia Cardíaca (L x min)</div><div class="value">${somatometria.frecuencia_cardiaca || '-'}</div></div>
        <div class="item"><div class="label">Frecuencia Respiratoria (R x min)</div><div class="value">${somatometria.frecuencia_respiratoria || '-'}</div></div>
      </div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    <div class="section">
      <div class="section-title">AGUDEZA VISUAL</div>
      ${somatometria ? `
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Sin Corrección</th>
            <th>Con Corrección</th>
            <th>Estenopeico</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Ojo Derecho</strong></td>
            <td>${somatometria.od_sin_correccion || '-'}</td>
            <td>${somatometria.od_con_correccion || '-'}</td>
            <td>${somatometria.od_estenopeico || '-'}</td>
          </tr>
          <tr>
            <td><strong>Ojo Izquierdo</strong></td>
            <td>${somatometria.oi_sin_correccion || '-'}</td>
            <td>${somatometria.oi_con_correccion || '-'}</td>
            <td>${somatometria.oi_estenopeico || '-'}</td>
          </tr>
        </tbody>
      </table>
      <div class="grid" style="margin-top:4px;">
        <div class="item"><div class="label">Test Ishihara</div><div class="value">${somatometria.ishihara || '-'}</div></div>
        ${somatometria.ishihara === 'POSITIVO' ? `
        <div class="item"><div class="label">Detalle Ishihara</div><div class="value">${this.limpiarHTML(somatometria.ishihara_detalle)}</div></div>
        ` : ''}
      </div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    <div class="section">
      <div class="section-title">EXPLORACIÓN</div>
      ${somatometria && somatometria.exploracion ? `
      <div style="padding:4px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(somatometria.exploracion)}</div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    <div class="section">
      <div class="section-title">SÍNTESIS TÉCNICA</div>
      ${somatometria && somatometria.sintesis_tecnica ? `
      <div style="padding:4px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(somatometria.sintesis_tecnica)}</div>
      ` : '<p>Sin datos registrados</p>'}
    </div>
    <br>

    ${somatometria && somatometria.loc ? `
    <div class="section">
      <div class="section-title">LOC</div>
      ${somatometria.loc_num_evaluacion ? `<div style="margin-bottom:4px;"><span class="label" style="font-weight:600;">NÚMERO DE EVALUACIÓN LOC: </span><span class="value">${somatometria.loc_num_evaluacion}</span></div>` : ''}
      <div style="padding:4px;background:#f8f9fa;border-radius:3px;">${this.limpiarHTML(somatometria.loc_detalle)}</div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Documentación Médica</div>
      ${documentos.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Tipo</th>
            <th>Observaciones</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${documentos.map(d => `
          <tr>
            <td>Documento médico</td>
            <td>${d.tipo_documento || '-'}</td>
            <td>${d.observaciones || '-'}</td>
            <td>${d.creado}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p>Sin documentos cargados</p>'}
    </div>

    <div class="section">
      <div class="section-title">RESULTADOS</div>
      <div class="grid">
        <div class="item"><div class="label">Resultado</div><div class="value">${somatometria && somatometria.sintesis_resultado ? somatometria.sintesis_resultado : '-'}</div></div>
        <div class="item"><div class="label">Resultado LOC</div><div class="value">${somatometria && somatometria.loc_resultado ? somatometria.loc_resultado : '-'}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">FIRMAS</div>
      <table style="margin-top:8px;">
        <tbody>
          <tr>
            <td style="text-align:center;padding:15px;width:33%;">
              <div style="border-bottom:1px solid #333;margin-bottom:5px;padding-bottom:30px;">${clave_evaluador || ''}</div>
              <div style="font-weight:600;">Evaluador</div>
            </td>
            <td style="text-align:center;padding:15px;width:33%;">
              <div style="border-bottom:1px solid #333;margin-bottom:5px;padding-bottom:30px;">${finalizado && finalizado.clave_supervisor ? finalizado.clave_supervisor : ''}</div>
              <div style="font-weight:600;">Supervisor</div>
            </td>
            <td style="text-align:center;padding:15px;width:33%;">
              <div style="border-bottom:1px solid #333;margin-bottom:5px;padding-bottom:30px;">${finalizado && finalizado.clave_responsable ? finalizado.clave_responsable : ''}</div>
              <div style="font-weight:600;">Responsable</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  <div class="footer">
    Expediente Médico CECC SSC CDMX · Generado el ${new Date().toLocaleDateString('es-MX')}
  </div>
</body>
</html>
    `;
  }
};

module.exports = consultaController;
