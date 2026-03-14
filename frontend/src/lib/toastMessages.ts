export const TOAST_MESSAGES = {
  sales: {
    cancelSuccess: 'Venta anulada correctamente',
    cancelError: 'No se pudo anular la venta'
  },
  payments: {
    bankDataCopied: 'Datos bancarios copiados al portapapeles.',
    bankDataCopyError: 'No se pudieron copiar los datos bancarios.',
    whatsappOpenedWithBankData: 'WhatsApp abierto con los datos bancarios listos para enviar.',
    whatsappOpenError: 'No se pudo abrir WhatsApp.',
    emailOpenedWithBankData: 'Cliente de correo abierto con los datos bancarios.',
    emailOpenError: 'No se pudo abrir el cliente de correo.',
    divisionSaveError: 'No se pudo guardar la división del pago',
    divisionLocked: 'No se puede editar la división del pago luego de iniciar la venta',
    saleNotInitialized: 'La venta no está inicializada',
    paymentStatusUpdateError: 'No se pudo actualizar el estado del pago',
    saleCompleted: '¡Venta completada con éxito!',
    saleCloseError: 'No se pudo cerrar la venta',
    infoWhatsappOpened: 'WhatsApp abierto con la información lista para enviar.',
    infoEmailOpened: 'Cliente de correo abierto con la información.',
    linkCopied: 'Enlace copiado al portapapeles'
  },
  items: {
    quickAddSuccess: 'Ítem agregado',
    quickAddError: 'No se pudo agregar el ítem',
    sepaPriceUpdated: 'Precio SEPA actualizado',
    updated: 'Ítem actualizado',
    created: 'Ítem creado',
    saveError: 'No se pudo guardar el ítem',
    deleted: 'Ítem eliminado',
    deleteError: 'No se pudo eliminar el ítem',
    categoryAssignSuccess: (updatedCount) => `Categoría asignada a ${updatedCount} ítems`,
    categoryAssignError: 'No se pudo asignar la categoría',
    setPriceError: 'No se pudo actualizar el precio',
    increasePriceSuccess: (percent, updatedCount) => `Precio aumentado en ${percent}% para ${updatedCount} ítems`,
    updatePricesError: 'No se pudieron actualizar los precios',
    csvPreviewWarning: (errorCount) => `Vista previa CSV generada con ${errorCount} errores de parseo`,
    previewImportError: 'No se pudo generar la vista previa de importación',
    importSuccess: (importedCount, createdCount, updatedCount) => `Se importaron ${importedCount || 0} ítems (creados: ${createdCount}, actualizados: ${updatedCount})`,
    importError: 'No se pudieron importar los ítems',
    priceUpdated: (updatedCount) => `Precio actualizado en ${updatedCount} ítems`
  },
  settings: {
    businessInfoSaved: 'Información del negocio guardada',
    businessInfoSaveError: 'No se pudo guardar la información del negocio',
    businessOptionsSaved: 'Opciones del negocio guardadas',
    businessOptionsSaveError: 'No se pudieron guardar las opciones del negocio',
    categoryUpdated: 'Categoría actualizada',
    categoryCreated: 'Categoría creada',
    categorySaveError: 'No se pudo guardar la categoría',
    categoryDeleted: 'Categoría eliminada',
    categoryDeleteError: 'No se pudo eliminar la categoría',
    paymentMethodsSaved: 'Métodos de pago guardados',
    paymentMethodsSaveError: 'No se pudieron guardar los métodos de pago',
    bankAccountSaved: 'Cuenta bancaria guardada',
    bankAccountSaveError: 'No se pudo guardar la cuenta bancaria',
    businessEmailRequiredForSmtp: 'El correo del negocio es obligatorio para enviar emails SMTP',
    smtpPortRequired: 'El puerto SMTP es obligatorio',
    smtpConfigSaved: 'Configuración SMTP guardada',
    smtpConfigSaveError: 'No se pudo guardar la configuración SMTP',
    smtpRecipientRequired: 'Agregá un email destinatario para ejecutar la prueba SMTP',
    smtpTestSuccess: 'Prueba de configuración SMTP exitosa',
    moduleToggleSuccess: (isEnabled) => `Módulo ${isEnabled ? 'habilitado' : 'deshabilitado'}`
  },
  reports: {
    exportEmptyFile: 'La exportación terminó pero el archivo está vacío. Probá con otro rango de fechas.',
    exportSuccess: 'Reporte exportado',
    exportError: 'No se pudo exportar el reporte'
  },
  business: {
    loadError: 'No se pudieron cargar los negocios',
    selectError: 'No se pudo seleccionar el negocio'
  },
  profile: {
    updateSuccess: 'Perfil actualizado correctamente',
    updateError: 'No se pudo actualizar el perfil',
    passwordsDoNotMatch: 'Las nuevas contraseñas no coinciden',
    passwordMinLength: 'La contraseña debe tener al menos 8 caracteres',
    passwordChangeSuccess: 'Contraseña cambiada correctamente',
    passwordChangeError: 'No se pudo cambiar la contraseña'
  },
  pos: {
    itemAdded: (itemName) => `Se agregó ${itemName}`,
    cartEmpty: 'El carrito está vacío',
    syncSuccess: (successCount) => `Se sincronizaron ${successCount} venta${successCount !== 1 ? 's' : ''}`,
    syncError: (failCount) => `No se pudieron sincronizar ${failCount} venta${failCount !== 1 ? 's' : ''}`
  },
  cashRegister: {
    openSuccess: 'Caja registradora abierta',
    openError: 'Error al hacer apertura de caja',
    closeSuccess: 'Caja registradora cerrada',
    closeError: 'Error al hacer cierre de caja'
  },
  tickets: {
    downloadSuccess: 'Ticket PDF descargado correctamente.',
    downloadError: 'No se pudo descargar el PDF del ticket.',
    whatsappOpened: 'WhatsApp abierto con el ticket listo para enviar.',
    sendEmailError: 'No se pudo enviar el ticket por e-mail.',
    emailStatusCheckError: 'No se pudo confirmar el estado del envío de e-mail.',
    smtpRequired: 'Configurá un SMTP activo para habilitar el envío por e-mail.',
    invalidEmail: 'Ingresá un e-mail válido para enviar el ticket.',
    emailQueued: 'El correo quedó en cola y se enviará en segundo plano.'
  }
};

export const API_MESSAGES = {
  defaultError: 'Ocurrió un error. Por favor, intentá nuevamente.',
  csrfInitError: 'No se pudo inicializar la protección CSRF.',
  unexpectedHtmlResponse: 'Respuesta HTML inesperada. Revisá VITE_API_URL.',
  sessionExpired: 'Tu sesión expiró. Iniciá sesión nuevamente.'
};
