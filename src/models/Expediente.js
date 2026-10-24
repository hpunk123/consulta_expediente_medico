const pool = require('../database/database');
const poolv2 = require('../database/newDatabase');
const poolHC = require('../database/expedienteMedicoDatabase');
const poolSicoc = require('../database/sicocDatabase');

class Expediente {
  /**
   * Buscar evaluados por nombre
   * @param {string} nombre
   * @returns {Array} Resultados
   */
  static async searchByName(nombre) {
    return await poolv2.query(`
      SELECT DISTINCT
        u.idUser,
        u.nombre,
        u.empRfc,
        u.empleado,
        e.id_eval,
        e.anioEval,
        CASE WHEN e.tipo_eval = 1 THEN 'PERMANENCIA' ELSE 'NUEVO INGRESO' END AS tipo_eval,
        CASE WHEN ef.id_expediente_finalizado IS NOT NULL THEN 'Finalizado' ELSE 'En proceso' END AS estado,
        COALESCE(es_c.evalConsecutivo, es_v.evalConsecutivo) AS evalConsecutivo
      FROM cvlife.users u
      INNER JOIN vlifedb.tbl_eval_empeado e ON u.idUser = e.userId
      LEFT JOIN historia_clinica_db.tbl_expediente_finalizado ef ON e.id_eval = ef.id_eval AND ef.activo = 1
      LEFT JOIN consulta_expediente.tbl_enlace_sicoc es_c ON e.id_eval = es_c.id_eval AND es_c.eActivo = 1
      LEFT JOIN vlifedb.tbl_enlace_sicoc es_v ON e.id_eval = es_v.id_eval AND es_v.eActivo = 1
      WHERE (u.nombre LIKE ? OR u.empleado LIKE ? OR es_c.evalConsecutivo LIKE ? OR es_v.evalConsecutivo LIKE ?) 
        AND e.eActivo = 1
      ORDER BY e.anioEval DESC, u.nombre
    `, [`%${nombre}%`, `%${nombre}%`, `%${nombre}%`, `%${nombre}%`]);
  }

  /**
   * Obtener datos del evaluado
   * @param {number} id_eval
   * @returns {Object} Evaluado
   */
  static async getEvaluado(id_eval) {
    const [evaluado] = await poolv2.query(`
      SELECT u.nombre, u.empRfc, u.empleado, u.adscripcion,
             e.id_eval, e.anioEval, e.tipo_eval, e.userId,
             CASE WHEN e.tipo_eval = 1 THEN 'PERMANENCIA' ELSE 'NUEVO INGRESO' END AS tipo_eval_desc
      FROM cvlife.users u
      INNER JOIN vlifedb.tbl_eval_empeado e ON u.idUser = e.userId
      WHERE e.id_eval = ? AND e.eActivo = 1
    `, [id_eval]);
    return evaluado;
  }

  /**
   * Obtener datos personales desde vlifedb
   * @param {number} id_eval
   * @returns {Object} Datos personales
   */
  static async getDatosPersonales(id_eval) {
    const [personales] = await poolv2.query(
      `SELECT * FROM tbl_datos_personales WHERE id_evaluacion = ? AND pActivo = 1 ORDER BY pCreado DESC LIMIT 1`,
      [id_eval]
    );
    return personales;
  }

  /**
   * Obtener datos académicos desde vlifedb
   * @param {number} id_eval
   * @returns {Object} Datos académicos
   */
  static async getDatosAcademicos(id_eval) {
    const [academicos] = await poolv2.query(
      `SELECT * FROM tbl_datos_estudios WHERE id_evaluacion = ? AND eActtivo = 1 ORDER BY eCreado DESC LIMIT 1`,
      [id_eval]
    );
    return academicos;
  }

  /**
   * Obtener el id_usuario propietario de un expediente
   * Busca en todas las tablas el primer id_usuario encontrado
   * @param {number} id_eval
   * @returns {number|null} id_usuario o null si no tiene propietario
   */
  static async getPropietarioExpediente(id_eval) {
    const tablas = [
      'tbl_datos_generales',
      'tbl_antecedentes_heredo',
      'tbl_antecedentes_no_patologicos',
      'tbl_accidentes_laborales',
      'tbl_antecedentes_patologicos',
      'tbl_salud_sexual',
      'tbl_exploracion_fisica',
      'tbl_somatometria'
    ];
    
    for (const tabla of tablas) {
      const [row] = await poolHC.query(
        `SELECT id_usuario FROM ${tabla} WHERE id_eval = ? AND activo = 1 AND id_usuario IS NOT NULL LIMIT 1`,
        [id_eval]
      );
      if (row && row.id_usuario) {
        return row.id_usuario;
      }
    }
    return null;
  }

  /**
   * Sincronizar datos generales desde vlifedb a historia_clinica_db
   * @param {number} id_eval
   * @param {Object} evaluado
   * @returns {Object} Datos generales sincronizados
   */
  static async syncDatosGenerales(id_eval, evaluado, id_usuario = null) {
    try {
      // Verificar si existe registro activo
      const [existing] = await poolHC.query(
        'SELECT id_dato_general FROM tbl_datos_generales WHERE id_eval = ? AND activo = 1 LIMIT 1',
        [id_eval]
      );

      // Si ya existe, NO sincronizar (preservar datos editados por usuario)
      if (existing) {
        return null;
      }

      const personales = await this.getDatosPersonales(id_eval);
      const academicos = await this.getDatosAcademicos(id_eval);

      if (!personales || !personales.a_paterno) return null;

      const nombreCompleto = [personales.a_paterno, personales.a_materno, personales.nombre]
        .filter(Boolean).join(' ');

      const datosGenerales = {
        num_empleado: personales.empleado || evaluado.empleado || null,
        nombre_completo: nombreCompleto || null,
        genero: personales.sexo || null,
        escolaridad: academicos ? academicos.grado_estudios : null,
        rfc: personales.rfc || evaluado.empRfc || null,
        edad: personales.edad || null,
        fecha_nacimiento: personales.f_nacimiento || null,
        estado_civil: personales.edo_civil || null,
        telefono_celular: personales.tel_celular || null
      };

      // Insertar nuevo registro
      await poolHC.query(
        `INSERT INTO tbl_datos_generales (id_eval, num_empleado, nombre_completo, genero, escolaridad, rfc, edad, fecha_nacimiento, estado_civil, telefono_celular, id_usuario, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id_eval,
          datosGenerales.num_empleado,
          datosGenerales.nombre_completo,
          datosGenerales.genero,
          datosGenerales.escolaridad,
          datosGenerales.rfc,
          datosGenerales.edad,
          datosGenerales.fecha_nacimiento,
          datosGenerales.estado_civil,
          datosGenerales.telefono_celular,
          id_usuario
        ]
      );

      return datosGenerales;
    } catch (error) {
      console.error('Error sincronizando datos generales:', error.message);
      return null;
    }
  }

  /**
   * Obtener datos generales
   * @param {number} id_eval
   * @returns {Object} Datos generales
   */
  static async getDatosGenerales(id_eval) {
    const [datos] = await poolHC.query(
      'SELECT * FROM tbl_datos_generales WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return datos;
  }

  /**
   * Obtener antecedentes heredo familiares
   * @param {number} id_eval
   * @returns {Object} Antecedentes heredo
   */
  static async getHeredo(id_eval) {
    const [heredo] = await poolHC.query(
      'SELECT * FROM tbl_antecedentes_heredo WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return heredo;
  }

  /**
   * Obtener antecedentes no patológicos
   * @param {number} id_eval
   * @returns {Object} No patológicos
   */
  static async getNoPatologicos(id_eval) {
    const [noPat] = await poolHC.query(
      'SELECT * FROM tbl_antecedentes_no_patologicos WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return noPat;
  }

  /**
   * Obtener accidentes laborales
   * @param {number} id_eval
   * @returns {Object} Accidentes
   */
  static async getAccidentes(id_eval) {
    const [accidentes] = await poolHC.query(
      'SELECT * FROM tbl_accidentes_laborales WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return accidentes;
  }

  /**
   * Obtener antecedentes patológicos
   * @param {number} id_eval
   * @returns {Object} Patológicos
   */
  static async getPatologicos(id_eval) {
    const [patologicos] = await poolHC.query(
      'SELECT * FROM tbl_antecedentes_patologicos WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return patologicos;
  }

  /**
   * Obtener salud sexual
   * @param {number} id_eval
   * @returns {Object} Salud sexual
   */
  static async getSaludSexual(id_eval) {
    const [sexual] = await poolHC.query(
      'SELECT * FROM tbl_salud_sexual WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return sexual;
  }

  /**
   * Obtener tatuajes
   * @param {number} id_eval
   * @returns {Object} Tatuajes
   */
  static async getTatuajes(id_eval) {
    const [tatuajes] = await poolHC.query(
      'SELECT * FROM tbl_tatuajes WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return tatuajes;
  }

  /**
   * Obtener detalle de tatuajes
   * @param {number} id_eval
   * @returns {Array} Detalle tatuajes
   */
  static async getTatuajesDetalle(id_eval) {
    return await poolHC.query(
      'SELECT * FROM tbl_tatuajes_detalle WHERE id_eval = ? AND activo = 1 ORDER BY id_tatuaje_detalle ASC',
      [id_eval]
    );
  }

  /**
   * Obtener documentos médicos
   * @param {number} id_eval
   * @returns {Array} Documentos
   */
  static async getDocumentos(id_eval) {
    return await poolHC.query(
      'SELECT * FROM tbl_documentos_medicos WHERE id_eval = ? AND activo = 1 ORDER BY creado DESC',
      [id_eval]
    );
  }

  /**
   * Crear documento médico
   * @param {number} id_eval
   * @param {string} filename
   * @param {string} observaciones
   * @param {string} tipo_documento
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async createDocumento(id_eval, filename, observaciones, tipo_documento, id_usuario = null) {
    return await poolHC.query(
      'INSERT INTO tbl_documentos_medicos (id_eval, filename, observaciones, tipo_documento, id_usuario, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [id_eval, filename, observaciones, tipo_documento, id_usuario]
    );
  }

  /**
   * Eliminar documento médico (soft delete)
   * @param {number} id_eval
   * @returns {Object} Resultado
   */
  static async deleteDocumento(id_eval) {
    return await poolHC.query(
      'UPDATE tbl_documentos_medicos SET activo = 0 WHERE id_eval = ? AND activo = 1',
      [id_eval]
    );
  }

  /**
   * Obtener estado de finalización
   * @param {number} id_eval
   * @returns {Object} Finalizado
   */
  static async getFinalizado(id_eval) {
    const [finalizado] = await poolHC.query(`
      SELECT ef.fecha_finalizacion, ef.id_usuario, ef.id_responsable,
             u.nombre as usuario_finalizo, u.clave as clave_supervisor,
             r.nombre as responsable_nombre, r.clave as clave_responsable
      FROM tbl_expediente_finalizado ef
      LEFT JOIN consulta_expediente.tbl_usuarios u ON ef.id_usuario = u.id_usuario
      LEFT JOIN consulta_expediente.tbl_usuarios r ON ef.id_responsable = r.id_usuario
      WHERE ef.id_eval = ? AND ef.activo = 1 LIMIT 1
    `, [id_eval]);
    return finalizado;
  }

  /**
   * Obtener clave de usuario por ID
   * @param {number} id_usuario
   * @returns {Object} Usuario con clave
   */
  static async getUsuarioClave(id_usuario) {
    if (!id_usuario) return null;
    const [usuario] = await poolHC.query(
      'SELECT clave FROM consulta_expediente.tbl_usuarios WHERE id_usuario = ?',
      [id_usuario]
    );
    return usuario;
  }

  /**
   * Finalizar expediente
   * @param {number} id_eval
   * @param {number} id_usuario
   * @param {number} id_responsable
   * @returns {Object} Resultado
   */
  static async finalizarExpediente(id_eval, id_usuario, id_responsable) {
    // Verificar si ya está finalizado
    const [existing] = await poolHC.query(
      'SELECT id_expediente_finalizado FROM tbl_expediente_finalizado WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    if (existing) {
      return { alreadyFinalized: true };
    }

    return await poolHC.query(
      'INSERT INTO tbl_expediente_finalizado (id_eval, id_usuario, id_responsable, activo) VALUES (?, ?, ?, 1)',
      [id_eval, id_usuario, id_responsable]
    );
  }

  /**
   * Liberar expediente (solo admin)
   * @param {number} id_eval
   * @returns {Object} Resultado
   */
  static async liberarExpediente(id_eval) {
    return await poolHC.query(
      'UPDATE tbl_expediente_finalizado SET activo = 0 WHERE id_eval = ? AND activo = 1',
      [id_eval]
    );
  }

  /**
   * Crear tatuaje detalle
   * @param {Object} data
   * @returns {Object} Resultado
   */
  static async createTatuaje(data) {
    const { id_eval, zona, tamano, descripcion, significado, costo, anio, observaciones, id_usuario } = data;
    return await poolHC.query(
      'INSERT INTO tbl_tatuajes_detalle (id_eval, zona, tamano, descripcion, significado, costo, anio, observaciones, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id_eval, zona, tamano, descripcion, significado, costo, anio, observaciones, id_usuario || null]
    );
  }

  /**
   * Guardar observaciones de tatuajes
   * @param {number} id_eval
   * @param {string} observaciones
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async saveTatuajeObservaciones(id_eval, observaciones, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_tatuaje FROM tbl_tatuajes WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    if (existing) {
      return await poolHC.query(
        'UPDATE tbl_tatuajes SET observaciones = ? WHERE id_eval = ? AND activo = 1',
        [observaciones, id_eval]
      );
    } else {
      return await poolHC.query(
        'INSERT INTO tbl_tatuajes (id_eval, tiene_tatuaje, observaciones, activo) VALUES (?, ?, ?, 1)',
        [id_eval, 'SI', observaciones]
      );
    }
  }

  /**
   * Actualizar tiene_tatuaje
   * @param {number} id_eval
   * @param {string} tiene_tatuaje
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updateTieneTatuaje(id_eval, tiene_tatuaje, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_tatuaje FROM tbl_tatuajes WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    if (existing) {
      return await poolHC.query(
        'UPDATE tbl_tatuajes SET tiene_tatuaje = ? WHERE id_eval = ? AND activo = 1',
        [tiene_tatuaje, id_eval]
      );
    } else {
      return await poolHC.query(
        'INSERT INTO tbl_tatuajes (id_eval, tiene_tatuaje, activo) VALUES (?, ?, 1)',
        [id_eval, tiene_tatuaje]
      );
    }
  }

  /**
   * Actualizar tatuaje detalle
   * @param {number} id
   * @param {Object} data
   * @returns {Object} Resultado
   */
  static async updateTatuaje(id, data) {
    const { zona, tamano, descripcion, significado, costo, anio, observaciones } = data;
    return await poolHC.query(
      'UPDATE tbl_tatuajes_detalle SET zona = ?, tamano = ?, descripcion = ?, significado = ?, costo = ?, anio = ?, observaciones = ? WHERE id_tatuaje_detalle = ?',
      [zona, tamano, descripcion, significado, costo, anio, observaciones, id]
    );
  }

  /**
   * Eliminar tatuaje detalle (soft delete)
   * @param {number} id
   * @returns {Object} Resultado
   */
  static async deleteTatuaje(id) {
    return await poolHC.query(
      'UPDATE tbl_tatuajes_detalle SET activo = 0 WHERE id_tatuaje_detalle = ?',
      [id]
    );
  }

  /**
   * Obtener tatuaje por ID
   * @param {number} id
   * @returns {Object} Tatuaje
   */
  static async getTatuajeById(id) {
    const [tatuaje] = await poolHC.query(
      'SELECT * FROM tbl_tatuajes_detalle WHERE id_tatuaje_detalle = ? AND activo = 1',
      [id]
    );
    return tatuaje;
  }

  /**
   * Obtener todas las observaciones de antecedentes de un evaluado
   * @param {number} id_eval
   * @returns {Object} Observaciones por sección
   */
  static async getObservaciones(id_eval) {
    const rows = await poolHC.query(
      'SELECT seccion, contenido FROM tbl_observaciones_antecedentes WHERE id_eval = ? AND activo = 1',
      [id_eval]
    );

    const observaciones = {};
    rows.forEach(row => {
      observaciones[row.seccion] = row.contenido;
    });
    return observaciones;
  }

  /**
   * Guardar observación de antecedentes
   * Siempre crea un nuevo registro
   * Los registros anteriores conservan su estado (activo/inactivo)
   * @param {number} id_eval
   * @param {string} seccion
   * @param {string} contenido
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async saveObservacion(id_eval, seccion, contenido, id_usuario = null) {
    // Desactivar registro anterior si existe
    await poolHC.query(
      'UPDATE tbl_observaciones_antecedentes SET activo = 0 WHERE id_eval = ? AND seccion = ? AND activo = 1',
      [id_eval, seccion]
    );

    // Crear nuevo registro
    return await poolHC.query(
      'INSERT INTO tbl_observaciones_antecedentes (id_eval, seccion, contenido, id_usuario, activo) VALUES (?, ?, ?, ?, 1)',
      [id_eval, seccion, contenido, id_usuario]
    );
  }

  /**
   * Soft delete observación
   * @param {number} id_eval
   * @param {string} seccion
   * @returns {Object} Resultado
   */
  static async deleteObservacion(id_eval, seccion) {
    return await poolHC.query(
      'UPDATE tbl_observaciones_antecedentes SET activo = 0, modificado = NOW() WHERE id_eval = ? AND seccion = ? AND activo = 1',
      [id_eval, seccion]
    );
  }

  /**
   * Actualizar heredo familiares
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @returns {Object} Resultado
   */
  static async updateHeredo(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_antecedente_heredo FROM tbl_antecedentes_heredo WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const heredoData = { ...data };
    delete heredoData.id_eval;

    if (!existing) {
      // Crear nuevo registro
      heredoData.id_eval = Number(id_eval);
      heredoData.id_usuario = id_usuario;
      heredoData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_antecedentes_heredo SET ?', [heredoData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        `UPDATE tbl_antecedentes_heredo SET ? WHERE id_eval = ? AND activo = 1`,
        [heredoData, Number(id_eval)]
      );
    }
  }

  /**
   * Actualizar antecedentes no patológicos
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updateNoPatologicos(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_antecedente_np FROM tbl_antecedentes_no_patologicos WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const noPatData = {};
    Object.keys(data).forEach(key => {
      if (key !== 'id_eval') {
        if (key === 'veces_semana' || key === 'horas_sueno') {
          noPatData[key] = data[key] ? Number(data[key]) : null;
        } else {
          noPatData[key] = data[key] === '' ? null : data[key];
        }
      }
    });

    if (!existing) {
      // Crear nuevo registro
      noPatData.id_eval = Number(id_eval);
      noPatData.id_usuario = id_usuario;
      noPatData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_antecedentes_no_patologicos SET ?', [noPatData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        `UPDATE tbl_antecedentes_no_patologicos SET ? WHERE id_eval = ? AND activo = 1`,
        [noPatData, Number(id_eval)]
      );
    }
  }

  /**
   * Actualizar accidentes laborales
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updateAccidentes(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_accidente_laboral FROM tbl_accidentes_laborales WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const accidentesData = {};
    Object.keys(data).forEach(key => {
      if (key !== 'id_eval') {
        if (key === 'accidente_anio') {
          accidentesData[key] = data[key] ? Number(data[key]) : null;
        } else {
          accidentesData[key] = data[key] === '' ? null : data[key];
        }
      }
    });

    if (!existing) {
      // Crear nuevo registro
      accidentesData.id_eval = Number(id_eval);
      accidentesData.id_usuario = id_usuario;
      accidentesData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_accidentes_laborales SET ?', [accidentesData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        `UPDATE tbl_accidentes_laborales SET ? WHERE id_eval = ? AND activo = 1`,
        [accidentesData, Number(id_eval)]
      );
    }
  }

  /**
   * Actualizar antecedentes patológicos
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updatePatologicos(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_antecedente_pat FROM tbl_antecedentes_patologicos WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const patologicosData = {};
    Object.keys(data).forEach(key => {
      if (key !== 'id_eval') {
        patologicosData[key] = data[key] === '' ? null : data[key];
      }
    });

    if (!existing) {
      // Crear nuevo registro
      patologicosData.id_eval = Number(id_eval);
      patologicosData.id_usuario = id_usuario;
      patologicosData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_antecedentes_patologicos SET ?', [patologicosData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        `UPDATE tbl_antecedentes_patologicos SET ? WHERE id_eval = ? AND activo = 1`,
        [patologicosData, Number(id_eval)]
      );
    }
  }

  /**
   * Actualizar salud sexual
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @returns {Object} Resultado
   */
  static async updateSexual(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_salud_sexual FROM tbl_salud_sexual WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const sexualData = {};
    Object.keys(data).forEach(key => {
      if (key !== 'id_eval') {
        sexualData[key] = data[key] === '' ? null : data[key];
      }
    });

    if (!existing) {
      // Crear nuevo registro
      sexualData.id_eval = Number(id_eval);
      sexualData.id_usuario = id_usuario;
      sexualData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_salud_sexual SET ?', [sexualData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        `UPDATE tbl_salud_sexual SET ? WHERE id_eval = ? AND activo = 1`,
        [sexualData, Number(id_eval)]
      );
    }
  }

  /**
   * Actualizar datos generales
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updateDatosGenerales(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_dato_general FROM tbl_datos_generales WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const params = [
      data.rfc || null,
      data.genero || null,
      data.edad ? Number(data.edad) : null,
      data.fecha_nacimiento || null,
      data.estado_civil || null,
      data.escolaridad || null,
      data.telefono_celular || null
    ];

    if (existing) {
      // Actualizar registro existente (no modificar id_usuario)
      params.push(Number(id_eval));
      return await poolHC.query(
        `UPDATE tbl_datos_generales SET
         rfc = ?,
         genero = ?,
         edad = ?,
         fecha_nacimiento = ?,
         estado_civil = ?,
         escolaridad = ?,
         telefono_celular = ?
         WHERE id_eval = ? AND activo = 1`,
        params
      );
    } else {
      // Crear nuevo registro con id_usuario
      params.unshift(Number(id_eval));
      params.push(id_usuario);
      return await poolHC.query(
        `INSERT INTO tbl_datos_generales (id_eval, rfc, genero, edad, fecha_nacimiento, estado_civil, escolaridad, telefono_celular, id_usuario, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        params
      );
    }
  }

  /**
   * Obtener exploración física
   * @param {number} id_eval
   * @returns {Object} Exploración física
   */
  static async getExploracionFisica(id_eval) {
    const [exploracion] = await poolHC.query(
      'SELECT * FROM tbl_exploracion_fisica WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return exploracion;
  }

  /**
   * Actualizar exploración física
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @param {number} id_usuario
   * @returns {Object} Resultado
   */
  static async updateExploracionFisica(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_exploracion_fisica FROM tbl_exploracion_fisica WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const exploracionData = {
      cardiorespiratorio: data.cardiorespiratorio ? 1 : 0,
      cardiorespiratorio_obs: data.cardiorespiratorio_obs || null,
      endocrino: data.endocrino ? 1 : 0,
      endocrino_obs: data.endocrino_obs || null,
      osteomuscular: data.osteomuscular ? 1 : 0,
      osteomuscular_obs: data.osteomuscular_obs || null,
      neuropsiquiatrico: data.neuropsiquiatrico ? 1 : 0,
      neuropsiquiatrico_obs: data.neuropsiquiatrico_obs || null,
      otros: data.otros ? 1 : 0,
      otros_obs: data.otros_obs || null,
      habitus_exterior: data.habitus_exterior || null,
      sin_datos: data.sin_datos ? 1 : 0
    };

    if (!existing) {
      // Crear nuevo registro
      exploracionData.id_eval = Number(id_eval);
      exploracionData.id_usuario = id_usuario;
      exploracionData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_exploracion_fisica SET ?', [exploracionData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        'UPDATE tbl_exploracion_fisica SET ? WHERE id_eval = ? AND activo = 1',
        [exploracionData, Number(id_eval)]
      );
    }
  }

  /**
   * Obtener somatometría
   * @param {number} id_eval
   * @returns {Object} Somatometría
   */
  static async getSomatometria(id_eval) {
    const [somatometria] = await poolHC.query(
      'SELECT * FROM tbl_somatometria WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );
    return somatometria;
  }

  /**
   * Actualizar somatometría
   * Si no existe registro, lo crea
   * @param {number} id_eval
   * @param {Object} data
   * @returns {Object} Resultado
   */
  static async updateSomatometria(id_eval, data, id_usuario = null) {
    // Verificar si existe registro
    const [existing] = await poolHC.query(
      'SELECT id_somatometria FROM tbl_somatometria WHERE id_eval = ? AND activo = 1 LIMIT 1',
      [id_eval]
    );

    const somatometriaData = {
      peso: data.peso ? Number(data.peso) : null,
      talla: data.talla ? Number(data.talla) : null,
      imc: data.imc ? Number(data.imc) : null,
      estado_nutricional: data.estado_nutricional || null,
      presion_arterial: data.presion_arterial || null,
      frecuencia_cardiaca: data.frecuencia_cardiaca || null,
      frecuencia_respiratoria: data.frecuencia_respiratoria || null,
      od_sin_correccion: data.od_sin_correccion || null,
      od_con_correccion: data.od_con_correccion || null,
      od_estenopeico: data.od_estenopeico || null,
      oi_sin_correccion: data.oi_sin_correccion || null,
      oi_con_correccion: data.oi_con_correccion || null,
      oi_estenopeico: data.oi_estenopeico || null,
      ishihara: data.ishihara || null,
      ishihara_detalle: data.ishihara_detalle || null,
      exploracion: data.exploracion || null,
      sintesis_tecnica: data.sintesis_tecnica || null,
      sintesis_resultado: data.sintesis_resultado || null,
      loc: data.loc ? 1 : 0,
      loc_detalle: data.loc_detalle || null,
      loc_resultado: data.loc_resultado || null,
      loc_num_evaluacion: data.loc_num_evaluacion || null
    };

    if (!existing) {
      // Crear nuevo registro
      somatometriaData.id_eval = Number(id_eval);
      somatometriaData.id_usuario = id_usuario;
      somatometriaData.activo = 1;
      return await poolHC.query('INSERT INTO tbl_somatometria SET ?', [somatometriaData]);
    } else {
      // Actualizar registro existente (no modificar id_usuario)
      return await poolHC.query(
        'UPDATE tbl_somatometria SET ? WHERE id_eval = ? AND activo = 1',
        [somatometriaData, Number(id_eval)]
      );
    }
  }

  /**
   * Obtener expediente completo
   * @param {number} id_eval
   * @returns {Object} Expediente completo
   */
  static async getExpedienteCompleto(id_eval) {
    const evaluado = await this.getEvaluado(id_eval);
    if (!evaluado) return null;

    const [datosGenerales, heredo, noPat, accidentes, patologicos, sexual, tatuajes, finalizado, exploracionFisica, somatometria, enlaceSicoc] = await Promise.all([
      this.getDatosGenerales(id_eval),
      this.getHeredo(id_eval),
      this.getNoPatologicos(id_eval),
      this.getAccidentes(id_eval),
      this.getPatologicos(id_eval),
      this.getSaludSexual(id_eval),
      this.getTatuajes(id_eval),
      this.getFinalizado(id_eval),
      this.getExploracionFisica(id_eval),
      this.getSomatometria(id_eval),
      this.getEnlaceSicoc(id_eval)
    ]);

    // Si tiene evalConsecutivo, buscar datos en SICOC
    let datosSicoc = null;
    if (enlaceSicoc && enlaceSicoc.evalConsecutivo) {
      datosSicoc = await this.buscarEvaluacionSicoc(enlaceSicoc.evalConsecutivo);
    }

    const [tatuajesDetalle, documentos] = await Promise.all([
      this.getTatuajesDetalle(id_eval),
      this.getDocumentos(id_eval)
    ]);

    // Obtener propietario del expediente
    const id_usuario_propietario = await this.getPropietarioExpediente(id_eval);
    
    // Obtener clave del propietario
    const usuarioPropietario = await this.getUsuarioClave(id_usuario_propietario);
    const clave_evaluador = usuarioPropietario ? usuarioPropietario.clave : null;

    // Obtener observaciones de antecedentes
    const observaciones = await this.getObservaciones(id_eval);

    return {
      evaluado,
      datosGenerales,
      antecedentes: { heredo, noPat, accidentes, patologicos, sexual },
      tatuajes,
      tatuajesDetalle,
      documentos,
      finalizado,
      exploracionFisica,
      somatometria,
      enlaceSicoc,
      datosSicoc,
      observaciones,
      id_usuario_propietario,
      clave_evaluador,
      id_eval
    };
  }

  /**
   * Obtener datos de enlace sicoc
   * Busca primero en vlifedb, si no encuentra busca en consulta_expediente
   * @param {number} id_eval
   * @returns {Object} Enlace sicoc
   */
  static async getEnlaceSicoc(id_eval) {
    // 1. Buscar en vlifedb
    const [resultVlife] = await poolv2.query(`
      SELECT evalConsecutivo 
      FROM tbl_enlace_sicoc 
      WHERE id_eval = ? AND eActivo = 1
    `, [id_eval]);
    
    if (resultVlife) return resultVlife;
    
    // 2. Si no existe, buscar en consulta_expediente
    const [resultLocal] = await pool.query(`
      SELECT evalConsecutivo 
      FROM tbl_enlace_sicoc 
      WHERE id_eval = ? AND eActivo = 1
    `, [id_eval]);
    
    return resultLocal;
  }

  /**
   * Buscar evaluación en SICOC por consecutivo
   * @param {string} evalConsecutivo
   * @returns {Object} Datos de la evaluación
   */
  static async buscarEvaluacionSicoc(evalConsecutivo) {
    const [result] = await poolSicoc.query(`
      SELECT 
        empleados.empNombreCompleto,
        evaluacion.evalConsecutivo,
        evaluacion.evalNumEmpleado,
        subprograma.spgClave,
        evaluacion.evalAdscripcion,
        cargos.cgCargo
      FROM nb_empleado_evaluacion evaluacion
      INNER JOIN nb_cat_empleados empleados ON empleados.empID = evaluacion.empID
      INNER JOIN nb_cat_subprogramas subprograma ON subprograma.spgID = evaluacion.spgID
      INNER JOIN nb_cat_cargos cargos ON cargos.cgID = evaluacion.cgID
      WHERE evaluacion.evalConsecutivo = ?
    `, [evalConsecutivo]);
    return result;
  }
}

module.exports = Expediente;
