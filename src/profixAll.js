/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format', 'N/file'], function (record, search, log, format, file) {

  function get(context) {
    try {
      const action = context.action;
      log.debug('RESTlet GET request', { action });

      if (!action) return { error: 'Missing required parameter: action' };

      switch (action) {
        case 'getCases':
          return getCases(context);
        case 'getEquipmentList':
          return getEquipmentList();
        case 'getEquipmentBySubsidiaryName': // <-- ADD THIS LINE
          return getEquipmentBySubsidiaryName(context); // <-- ADD THIS LINE
        case 'getCaseDetails':
          return getCaseDetails(context);
        default:
          return { error: `Unknown action: ${action}` };
      }

    } catch (error) {
      log.error('RESTlet GET Failure', error);
      return { error: error.message || 'Unexpected RESTlet error' };
    }
  }

  function post(context) {
    try {
      const action = context.action;
      log.debug('RESTlet POST request', { action });

      if (!action) return { error: 'Missing required parameter: action' };

      switch (action) {
        case 'submitUsageReading':
          return submitUsageReading(context);
        case 'uploadTimesheet':
          return uploadTimesheet(context);
        case 'submitCaseData':
          return submitCaseData(context);

        default:
          return { error: `Unknown action: ${action}` };
      }

    } catch (error) {
      log.error('RESTlet POST Failure', error);
      return { error: error.message || 'Unexpected RESTlet error' };
    }
  }

  // ----------- Case Lookup (Existing) ------------
  function getCases(context) {
    const entityId = context.currentUser;
    log.debug('Getting cases for', entityId);

    if (!entityId) return { error: 'Missing required parameter: currentUser' };

    const employeeSearch = search.create({
      type: search.Type.EMPLOYEE,
      filters: [['entityid', 'is', entityId]],
      columns: ['internalid']
    });

    const employeeResult = employeeSearch.run().getRange({ start: 0, end: 1 });

    if (!employeeResult.length) {
      return { error: `No employee found for user: ${entityId}` };
    }

    const employeeId = employeeResult[0].getValue('internalid');

    const caseSearch = search.load({ id: 'customsearch_itbs_cmms_cases_mobile' });
    caseSearch.filters.push(search.createFilter({
      name: 'custrecord_itbs_cmms_technician',
      join: 'custrecord_itbs_cmms_case',
      operator: search.Operator.IS,
      values: employeeId
    }));

    const resultSet = caseSearch.run();
    const results = [];

    resultSet.each(result => {
      let image = '';
      const imageId = result.getValue({
        name: 'custrecord_itbs_cmms_equip_image',
        join: 'custevent_itbs_cmms_case_equipment'
      });

      if (imageId) {
        try {
          const fileObj = file.load({ id: imageId });
          image = fileObj.url;
        } catch (err) {
          log.error('ImageLoadError', err);
        }
      }

      results.push({
        caseNumber: result.getValue('casenumber'),
        caseType: result.getText('custevent_itbs_case_type') || 'Not Available',
        equipment: result.getText('custevent_itbs_cmms_case_equipment'),
        subject: result.getValue('title'),
        priority: result.getText('priority'),
        status: result.getText('status') || 'Not Available',
        statusValue: result.getValue('status') || 'Not Available',
        schedule: result.getValue('startdate'),
        image,
        location: result.getText('custevent_itbs_omn_case_location') || 'Not Available',
        equipmentSubsidiary: result.getText('custevent_itbs_omn_equip_sub') || 'Not Available',
        makeModel: result.getText('custevent_itbs_cmms_case_make_model') || 'Not Available'
      });

      return true;
    });

    return results;
  }

  // ----------- New Action: Get Equipment List ------------
function getEquipmentList() {
  try {
    const savedSearch = search.load({
      id: 'customsearch_itbs_equipment'
    });

    const results = [];
    const resultSet = savedSearch.run();
    let start = 0;
    const pageSize = 1000;

    let pagedResults;
    do {
      pagedResults = resultSet.getRange({
        start: start,
        end: start + pageSize
      });

      pagedResults.forEach(result => {
        const recordId = result.id;

        const readingEntered = result.getValue({
          name: 'custrecord_itbs_cmms_reading_entered',
          join: 'custrecord_itbs_cmms_equipment_'
        });

        const equipmentName = result.getValue({ name: 'name' });

        const employeeName = result.getText({
          name: 'custrecord_itbs_cmms_employee',
          join: 'custrecord_itbs_cmms_equipment_'
        });

        const readingTimestamp = result.getValue({
          name: 'custrecord_itbs_cmms_reading_timestamp',
          join: 'custrecord_itbs_cmms_equipment_'
        });

        const fixedAsset = result.getText({
          name: 'custrecord_itbs_cmms_eqp_fixedassetintid'
        });

        const fixedAssetId = result.getValue({
          name: 'custrecord_itbs_cmms_eqp_fa_internal_id'
        });

        results.push({
          id: recordId,
          equipmentName: equipmentName || 'N/A',
          reading: readingEntered || 0,
          employeeName: employeeName || 'N/A',
          readingTimestamp: readingTimestamp || 'N/A',
          fixedAsset: fixedAsset || 'N/A',
          fixedAssetID: fixedAssetId || 0
        });
      });

      start += pageSize;
    } while (pagedResults.length === pageSize);

    // Return success + equipment list (without usageRecords - optional)
    return {
      success: true,
      equipment: results
    };
  } catch (e) {
    log.error('getEquipmentList failed', e);
    return { success: false, error: e.message };
  }
}

  // ----------- New Action: getEquipmentBySubsidiaryName ------------
  function getEquipmentBySubsidiaryName(context) {
  try {
    var subsidiary = context.subsidiary;
    if (!subsidiary) {
      return { success: false, error: 'Subsidiary is required.' };
    }

    // 1. Load manuals (file URLs) indexed by equipment internal ID
    var manualSearch = search.load({ id: 'customsearch_itbs_equipment_2' });
    var manualResults = manualSearch.run().getRange({ start: 0, end: 1000 });
    var manualData = {};
    manualResults.forEach(function (result) {
      var eqId = result.id;
      var fileUrl = result.getValue({ name: 'url', join: 'file' });
      if (eqId) manualData[eqId] = fileUrl;
    });

    // 2. Get latest usage reading per equipment ID
    var readingSearch = search.create({
      type: 'customrecord_itbs_cmms_equipusagereading',
      filters: [],
      columns: [
        search.createColumn({ name: 'custrecord_itbs_cmms_equipment_', sort: search.Sort.ASC }),
        search.createColumn({ name: 'custrecord_itbs_cmms_reading_entered' }),
        search.createColumn({ name: 'custrecord_itbs_cmms_reading_timestamp', sort: search.Sort.DESC }),
      ],
    });

    var readingResults = readingSearch.run().getRange({ start: 0, end: 1000 });
    var readingData = {};
    readingResults.forEach(function (result) {
      var eqId = result.getValue('custrecord_itbs_cmms_equipment_');
      if (eqId && !readingData[eqId]) {
        readingData[eqId] = result.getValue('custrecord_itbs_cmms_reading_entered');
      }
    });

    // 3. Fetch equipment with subsidiary filter (including image field)
    var equipmentSearch = search.create({
      type: 'customrecord_itbs_cmms_equipment',
      filters: [
        ['custrecord_itbs_cmms_equip_subsidiary', 'anyof', subsidiary],
        'AND',
        ['isinactive', 'is', 'F'],
      ],
      columns: [
        'internalid',
        'name',
        'custrecord_itbs_cmms_equip_make_model',
        'custrecord_itbs_cmms_equipt_location',
        'custrecord_itbs_cmms_equip_type',
        'custrecord_itbs_cmms_equip_serial_number',
        'custrecord_itbs_cmms_equip_operational',
        'created',
        'custrecord_itbs_cmms_equip_image', // Add image field here
      ],
    });

    var equipmentResults = equipmentSearch.run().getRange({ start: 0, end: 1000 });
    var results = [];

    equipmentResults.forEach(function (result) {
      var id = result.getValue('internalid');
      var imageId = result.getValue('custrecord_itbs_cmms_equip_image');
      var imageUrl = null;

      // Load image file URL if available
      if (imageId) {
        try {
          var fileObj = file.load({ id: imageId });
          imageUrl = fileObj.url;
        } catch (imgErr) {
          log.error({ title: 'Image Load Error', details: imgErr });
        }
      }

      results.push({
        id: id,
        name: result.getValue('name'),
        make_model: result.getText('custrecord_itbs_cmms_equip_make_model') || 'N/A',
        location: result.getText('custrecord_itbs_cmms_equipt_location') || 'N/A',
        type: result.getText('custrecord_itbs_cmms_equip_type') || 'N/A',
        serial_number: result.getValue('custrecord_itbs_cmms_equip_serial_number') || '',
        operational: result.getText('custrecord_itbs_cmms_equip_operational') || 'N/A',
        created: result.getValue('created'),
        manual_url: manualData[id] || null,
        reading_entered: readingData[id] || null,
        image_url: imageUrl || null,
      });
    });

    return {
      success: true,
      equipment: results,
    };
  } catch (e) {
    log.error('getEquipmentBySubsidiaryName failed', e);
    return {
      success: false,
      error: e.message || 'An unexpected error occurred',
    };
  }
}

function getCaseDetails(context) {
  const { caseNumber, username } = context;

  log.debug({ title: 'Input Params', details: { caseNumber, username } });

  if (!caseNumber || !username) {
    log.error({ title: 'Missing Parameters', details: { caseNumber, username } });
    return { success: false, error: "Missing caseNumber or username" };
  }

  // Step 1: Get userId from username
  const userSearch = search.create({
    type: search.Type.EMPLOYEE,
    filters: [['entityid', 'is', username]],
    columns: ['internalid']
  });

  const userResults = userSearch.run().getRange({ start: 0, end: 1 });
  log.debug({ title: 'User Search Result', details: JSON.stringify(userResults) });

  if (!userResults.length) {
    return { success: false, error: "Username not found." };
  }

  const userId = userResults[0].getValue('internalid');
  log.debug({ title: 'User ID Found', details: userId });

  let caseId = '';
  let technicianTripId = '';
  const servicePartsresults = [];
  const taskCompletionresults = [];
  const timesheets = {};
  const caseMetadata = {};

  // Step 2: Search for service parts
  const servicePartsSearch = search.create({
    type: "supportcase",
    filters: [
      ["stage", "anyof", "@NOTCLOSED@"],
      "AND",
      ["casenumber", "startswith", caseNumber]
    ],
    columns: [
      search.createColumn({ name: "internalid", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      search.createColumn({ name: "casenumber" }),
      search.createColumn({ name: "title" }), // Subject
      search.createColumn({ name: "company" }),
      search.createColumn({ name: "contact" }),
      search.createColumn({ name: "profile" }),
      search.createColumn({ name: "priority" }),
      search.createColumn({ name: "status" }),
      search.createColumn({ name: "stage" }),
      search.createColumn({ name: "assigned" }),
      search.createColumn({ name: "startdate" }),
      search.createColumn({ name: "custevent_itbs_omn_case_stages" }), // Schedule
      search.createColumn({ name: "custevent_itbs_cmms_case_equipment" }),
      search.createColumn({ name: "custevent_itbs_cmms_case_make_model" }),
      search.createColumn({ name: "custevent_itbs_omn_case_location" }),
      search.createColumn({ name: "subsidiary" }),
      search.createColumn({ name: "custrecord_itbs_omn_part_select", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      search.createColumn({ name: "custrecord_itbs_omn_qty_parts", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      search.createColumn({ name: "custrecord_itbs_qty_to_return", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      search.createColumn({ name: "custrecord_itbs_cmms_qty_used_case", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" })
    ]
  });

  const partResults = servicePartsSearch.run().getRange({ start: 0, end: 100 });
  log.debug({ title: 'Service Parts Search Result Count', details: partResults.length });

  if (!partResults.length) {
    return { success: false, error: "Case not found or no service parts." };
  }

  const first = partResults[0];
  caseId = first.id;

  // Step 2b: Extract metadata including subject and schedule
  caseMetadata.subject = first.getValue({ name: "title" }) || '';
  caseMetadata.schedule = first.getText({ name: "custevent_itbs_omn_case_stages" }) || '';
  caseMetadata.company = first.getText({ name: "company" });
  caseMetadata.contact = first.getText({ name: "contact" });
  caseMetadata.profile = first.getText({ name: "profile" });
  caseMetadata.priority = first.getText({ name: "priority" });
  caseMetadata.status = first.getText({ name: "status" });
  caseMetadata.stage = first.getText({ name: "stage" });
  caseMetadata.assigned = first.getText({ name: "assigned" });
  caseMetadata.startdate = first.getValue({ name: "startdate" });
  caseMetadata.caseStage = first.getText({ name: "custevent_itbs_omn_case_stages" });
  caseMetadata.equipment = first.getText({ name: "custevent_itbs_cmms_case_equipment" });
  caseMetadata.makeModel = first.getText({ name: "custevent_itbs_cmms_case_make_model" });
  caseMetadata.location = first.getText({ name: "custevent_itbs_omn_case_location" }) || '';
  caseMetadata.subsidiary = first.getText({ name: "subsidiary" }) || '';

  log.debug({ title: 'Case Metadata with Subject & Schedule', details: JSON.stringify(caseMetadata) });

  // Step 3: Service parts list
  partResults.forEach((result, index) => {
    const part = {
      servicePartId: result.getValue({ name: "internalid", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      servicePart: result.getText({ name: "custrecord_itbs_omn_part_select", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      servicePartName: result.getText({ name: "custrecord_its_omn_desc_part", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      subject: caseMetadata.subject,
      quantity: +result.getValue({ name: "custrecord_itbs_omn_qty_parts", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0,
      qtyUsed: +result.getValue({ name: "custrecord_itbs_cmms_qty_used_case", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0,
      qtyReturned: +result.getValue({ name: "custrecord_itbs_qty_to_return", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0
    };
    servicePartsresults.push(part);
    log.debug({ title: `Service Part [${index}]`, details: JSON.stringify(part) });
  });

  // Step 4: Task completions
  const taskCompletionSearch = search.create({
    type: "customrecord_itbs_cmms_srvc_conf_srv_tsk",
    filters: [["custrecord_itbs_case_srv_task", "anyof", caseId]],
    columns: [
      search.createColumn({ name: "custrecord_itbs_cmms_cnfgtsk_eqpmnt" }),
      search.createColumn({ name: "custrecord_itbs_cmms_srvcnfg_srvtask" }),
      search.createColumn({ name: "title", join: "CUSTRECORD_ITBS_CASE_SRV_TASK" }),
      search.createColumn({ name: "custrecord_itbs_cmms_cscst_taskcompleted" })
    ]
  });

  taskCompletionSearch.run().each((result, index) => {
    const task = {
      recordId: result.id,
      equipment: result.getText({ name: 'custrecord_itbs_cmms_cnfgtsk_eqpmnt' }),
      serviceTask: result.getText({ name: 'custrecord_itbs_cmms_srvcnfg_srvtask' }),
      subject: result.getValue({ name: 'title', join: 'custrecord_itbs_case_srv_task' }),
      taskCompleted: result.getValue({ name: 'custrecord_itbs_cmms_cscst_taskcompleted' })
    };
    taskCompletionresults.push(task);
    log.debug({ title: `Task Completion [${index}]`, details: JSON.stringify(task) });
    return true;
  });

  // Step 5: Technician trip
  const techTripSearch = search.create({
    type: "customrecord_itbs_cmms_tech_time_alloca",
    filters: [
      ["custrecord_itbs_cmms_technician", "anyof", userId],
      "AND",
      ["custrecord_itbs_cmms_case", "anyof", caseId]
    ],
    columns: [search.createColumn({ name: "custrecord_itbs_cmms_case" })]
  }).run().getRange({ start: 0, end: 1 });

  if (techTripSearch.length > 0) {
    technicianTripId = techTripSearch[0].id;
    caseId = techTripSearch[0].getValue({ name: 'custrecord_itbs_cmms_case' });
    log.debug({ title: 'Technician Trip Found', details: { technicianTripId, caseId } });
  } else {
    log.debug({ title: 'No Technician Trip Found', details: { userId, caseId } });
  }

  // Step 6: Timesheets
  if (technicianTripId) {
    const timesheetSearch = search.create({
      type: "customrecord_itbs_technician_timesheets",
      filters: [["custrecord_itbs_tech_trip", "anyof", technicianTripId]],
      columns: [
        search.createColumn({ name: "custrecord_itbs_tech_trip_type" }),
        search.createColumn({ name: "custrecord_itbs_tech_trip_time" })
      ]
    });

    timesheetSearch.run().each((result, index) => {
      const type = result.getValue({ name: 'custrecord_itbs_tech_trip_type' });
      const time = result.getValue({ name: 'custrecord_itbs_tech_trip_time' });
      timesheets[type] = time;
      log.debug({ title: `Timesheet [${index}]`, details: { type, time } });
      return true;
    });
  }

  const finalResult = {
    success: true,
    caseNumber,
    userId,
    caseId,
    technicianTripId,
    servicePartsresults,
    taskCompletionresults,
    timesheets,
    ...caseMetadata
  };

  log.debug({ title: 'Final Response', details: JSON.stringify(finalResult) });

  return finalResult;
}

  // ----------- New Action: Submit Usage Reading ------------
function submitUsageReading(context) {
  try {
    const equipmentId = context.equipmentId;
    const newMileage = context.newMileage;
    const readingTimestamp = context.readingTimestamp;

    log.debug('POST Request Data', { equipmentId, newMileage, readingTimestamp });

    // VALIDATION: only check equipmentId and newMileage now
    if (!equipmentId || !newMileage) {
      throw new Error('Equipment ID and New Mileage are required.');
    }

    const currentTimestamp = new Date();

    // Create CMMS Equipment Usage Record
    const cmmsRecord = record.create({
      type: 'customrecord_itbs_equipment_usage',
      isDynamic: true
    });

    cmmsRecord.setValue({ fieldId: 'custrecord_itbs_usage_equipment', value: equipmentId });
    cmmsRecord.setValue({ fieldId: 'custrecord_itbs_quip_usage', value: newMileage });
    cmmsRecord.setValue({ fieldId: 'custrecord_itbs_trigger_type', value: 1 });
    cmmsRecord.setValue({
      fieldId: 'custrecord_itbs_usage_date',
      value: format.parse({ value: currentTimestamp, type: format.Type.DATETIME })
    });

    const cmmsRecordId = cmmsRecord.save();
    log.debug('Created CMMS Usage Record', cmmsRecordId);

    // You removed fixedAssetId, so skip creating Asset Usage Record

    // Skip searching usage records by fixedAssetId since we don't have it

    return {
      success: true,
      cmmsRecordId
    };

  } catch (error) {
    log.error('submitUsageReading failed', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred'
    };
  }
}

// ----------- New Action: Upload Timesheet ------------
function uploadTimesheet(context) {
  try {
    const { technicianTripId, type, time } = context;

    if (!technicianTripId || !type || !time) {
      return {
        success: false,
        error: 'Missing required fields: technicianTripId, type, or time'
      };
    }

    const timesheetRecord = record.create({
      type: 'customrecord_itbs_technician_timesheets',
      isDynamic: true
    });

    timesheetRecord.setValue({
      fieldId: 'custrecord_itbs_tech_trip',
      value: technicianTripId
    });

    timesheetRecord.setValue({
      fieldId: 'custrecord_itbs_tech_trip_type',
      value: type
    });

    timesheetRecord.setValue({
      fieldId: 'custrecord_itbs_tech_trip_time',
      value: time
    });

    const savedRecordId = timesheetRecord.save();

    return {
      success: true,
      message: 'Timesheet record created successfully.',
      recordId: savedRecordId
    };

  } catch (error) {
    log.error('uploadTimesheet failed', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while uploading timesheet'
    };
  }
}

function submitCaseData(context) {
  try {
    const timesheets = context.timesheets;
    const imagePayload = context.imagePayload;
    const otherPayload = context.otherPayload;
    const caseNumber = imagePayload.caseNumber;

    const signatureFolderId = 1003999;
    let technicianFileId, supervisorFileId;
    let images = [];

    const currentDate = new Date().toISOString().replace(/[:.]/g, '-');

    // Save captured photos
    for (let i = 0; i < imagePayload.images.length; i++) {
      const content = imagePayload.images[i].split(',')[1];
      const picFile = file.create({
        name: `case_${caseNumber}_${i}_${currentDate}.png`,
        fileType: file.Type.PNGIMAGE,
        contents: content,
        folder: -4 // Images folder
      });
      images.push(picFile.save());
    }

    // Save signatures
    const techSig = imagePayload.signatures.technician.split(',')[1];
    const supSig = imagePayload.signatures.supervisor.split(',')[1];

    const technicianFile = file.create({
      name: `case_${caseNumber}_technician_signature.png`,
      fileType: file.Type.PNGIMAGE,
      contents: techSig,
      folder: signatureFolderId
    });
    technicianFileId = technicianFile.save();

    const supervisorFile = file.create({
      name: `case_${caseNumber}_supervisor_signature.png`,
      fileType: file.Type.PNGIMAGE,
      contents: supSig,
      folder: signatureFolderId
    });
    supervisorFileId = supervisorFile.save();

    // Load and update Case record
    const caseRecord = record.load({
      type: 'supportcase',
      id: otherPayload.caseId,
      isDynamic: true
    });

    caseRecord.setValue({
      fieldId: 'custevent_cmms_eqsrv_tech_sign_waived',
      value: technicianFileId
    });

    caseRecord.setValue({
      fieldId: 'custevent_cmms_eqsrv_signature_waived',
      value: supervisorFileId
    });

    for (let photoId of images) {
      caseRecord.selectNewLine({ sublistId: 'recmachcustrecord_itbs_case_pic_parent' });
      caseRecord.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_itbs_case_pic_parent',
        fieldId: 'custrecord_itbs_case_pic_link',
        value: photoId
      });
      caseRecord.setCurrentSublistValue({
        sublistId: 'recmachcustrecord_itbs_case_pic_parent',
        fieldId: 'custrecord_itbs_case_pic_photo',
        value: photoId
      });
      caseRecord.commitLine({ sublistId: 'recmachcustrecord_itbs_case_pic_parent' });
    }

    caseRecord.save();

    // Update parts usage
    for (let part of otherPayload.taskParts) {
      record.submitFields({
        type: 'customrecord_itbs_omn_service_parts',
        id: part.servicePartId,
        values: {
          custrecord_itbs_cmms_qty_used_case: part.qtyUsed,
          custrecord_itbs_qty_to_return: part.qtyReturned
        }
      });
    }

    // Timesheet flags
    if (timesheets['Work Completed']) {
      record.submitFields({
        type: 'customrecord_itbs_cmms_tech_time_alloca',
        id: otherPayload.technicianTripId,
        values: {
          custrecord_itbs_cmms_technician_accepted: true,
          custrecord_itbs_cmms_tech_completed: true
        }
      });
    } else if (timesheets['Departed for Site']) {
      record.submitFields({
        type: 'customrecord_itbs_cmms_tech_time_alloca',
        id: otherPayload.technicianTripId,
        values: {
          custrecord_itbs_cmms_technician_accepted: true
        }
      });
    }

    return {
      success: true,
      message: 'Case updated and images/signatures uploaded successfully.'
    };
  } catch (error) {
    log.error('submitCaseData error', error);
    return {
      success: false,
      error: error.message || 'Unexpected error'
    };
  }
}

  return {
    get,
    post
  };
});
