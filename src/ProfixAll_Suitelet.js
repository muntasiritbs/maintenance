/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  'N/ui/serverWidget',
  'N/log',
  'N/record',
  'N/search',
  'N/file',
  'N/format'
], function (ui, log, record, search, file, format) {

  function onRequest(context) {
    const request = context.request;
    const response = context.response;

    // --- Set CORS Headers ---
    response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' });
    response.setHeader({ name: 'Access-Control-Allow-Headers', value: 'Content-Type' });
    response.setHeader({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' });
    response.setHeader({ name: 'Content-Type', value: 'application/json' });

    // --- Handle Preflight ---
    if (request.method === 'OPTIONS') {
      response.write(JSON.stringify({ success: true }));
      return;
    }

    try {
      const method = request.method;
      const isGet = method === 'GET';
      const isPost = method === 'POST';

      // Parse input
      let input = {};
      if (isGet) {
        input = request.parameters || {};
      } else if (isPost) {
        input = JSON.parse(request.body || '{}');
      }

      const action = input.action;
      if (!action) {
        response.write(JSON.stringify({ success: false, error: 'Missing action parameter' }));
        return;
      }

      // Dispatch Actions
      let result;

      switch (action) {
        case 'getCases':
          result = getCases(input);
          break;
        case 'getEquipmentList':
          // Pass subsidiary parameter from frontend
          result = getEquipmentList(input.subsidiary);
          break;
        case 'getLast10CasesByEquipmentId':
          result = getLast10CasesByEquipmentId(input);
          break;
        case 'getEquipmentBySubsidiaryName':
          result = getEquipmentBySubsidiaryName(input);
          break;
        case 'getCaseDetails':
          result = getCaseDetails(input);
          break;
        case 'submitUsageReading':
          result = submitUsageReading(input);
          break;
        case 'uploadTimesheet':
          result = uploadTimesheet(input);
          break;
        case 'submitCaseData':
          result = submitCaseData(input);
          break;
        case 'TASK_COMPLETED':
          result = markTaskAsCompleted(input);
          break;
        default:
          result = { success: false, error: `Unknown action: ${action}` };
      }

      response.write(JSON.stringify(result));

    } catch (e) {
      log.error('Suitelet Error', e);
      response.write(JSON.stringify({ success: false, error: e.message || 'Unexpected error' }));
    }
  }

  // ----------- GET FUNCTIONS ------------
  // ----------- New Action: GET Cases ------------
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
        equipmentSubsidiary: result.getText('subsidiary') || 'Not Available',
        makeModel: result.getText('custevent_itbs_cmms_case_make_model') || 'Not Available'
      });

      return true;
    });

    return results;
  }

// ----------- New Action: GET Case Details ------------
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
      search.createColumn({ name: "custrecord_itbs_cmms_qty_used_case", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }),
      search.createColumn({ name: 'custrecord_its_omn_desc_part', join: 'custrecord_itbs_omn_case_parts' }),
      search.createColumn({ name: 'custrecord2728', join: 'custrecord_itbs_omn_case_parts' })
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
  caseMetadata.schedule = first.getValue('startdate'),
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
      servicePart: result.getText({ name: "custrecord_itbs_omn_part_select", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" })  || 'N/A',
      subject: caseMetadata.subject,
      quantity: +result.getValue({ name: "custrecord_itbs_omn_qty_parts", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0,
      qtyUsed: +result.getValue({ name: "custrecord_itbs_cmms_qty_used_case", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0,
      qtyReturned: +result.getValue({ name: "custrecord_itbs_qty_to_return", join: "CUSTRECORD_ITBS_OMN_CASE_PARTS" }) || 0,
      displayName: result.getValue({ name: 'custrecord2728', join: 'custrecord_itbs_omn_case_parts' }) || 'Null'
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
      //
      search.createColumn({ name: "custrecord_itbs_omn_task_subgrp" }),      
      search.createColumn({ name: "title", join: "CUSTRECORD_ITBS_CASE_SRV_TASK" }),
      search.createColumn({ name: "custrecord_itbs_cmms_cscst_taskcompleted" })
    ]
  });

  taskCompletionSearch.run().each((result, index) => {
    const task = {
      recordId: result.id,
      equipment: result.getText({ name: 'custrecord_itbs_cmms_cnfgtsk_eqpmnt' }),
      serviceTask: result.getText({ name: 'custrecord_itbs_cmms_srvcnfg_srvtask' }),
      serviceSubGrp: result.getText({ name: 'custrecord_itbs_omn_task_subgrp' }),
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

// ----------- New Action: getEquipmentBySubsidiaryName ------------
function getEquipmentBySubsidiaryName(context) {
  try {
    var subsidiary = context.subsidiary;
    if (!subsidiary) {
      return { success: false, error: 'Subsidiary is required.' };
    }

    // 1. Load manuals indexed by equipment internal ID
    var manualSearch = search.load({ id: 'customsearch_itbs_equipment_all_sub' });
    var manualResults = manualSearch.run().getRange({ start: 0, end: 1000 });
    var manualData = {};
    manualResults.forEach(function (result) {
      var eqId = result.id;
      var fileUrl = result.getValue({ name: 'url', join: 'file' });
      if (eqId) manualData[eqId] = fileUrl;
    });

    // 2. Get latest usage reading for each equipment (sorted by created date DESC)
    var readingSearch = search.create({
      type: 'customrecord_itbs_equipment_usage',
      filters: [],
      columns: [
        search.createColumn({ name: 'custrecord_itbs_usage_equipment' }),
        search.createColumn({ name: 'custrecord_itbs_quip_usage' }),
        search.createColumn({ name: 'created', sort: search.Sort.DESC }) // sort by newest
      ]
    });

    var readingResults = readingSearch.run().getRange({ start: 0, end: 1000 });
    var readingData = {};

    // Iterate through reading results, ensuring only the latest reading for each equipment ID is saved
    readingResults.forEach(function (result) {
      var eqId = result.getValue('custrecord_itbs_usage_equipment');
      if (eqId && !readingData[eqId]) {  // Only store the first/latest reading for each equipment
        readingData[eqId] = {
          reading: result.getValue('custrecord_itbs_quip_usage'),
          created: result.getValue('created') // latest created date
        };
      }
    });

    // 3. Fetch equipment filtered by subsidiary (using saved search)
    var equipmentSearch = search.load({ id: 'customsearch_itbs_equipment_all_sub' });

    // Add filter for subsidiary dynamically
    equipmentSearch.filters.push(
      search.createFilter({
        name: 'custrecord_itbs_cmms_equip_subsidiary',
        operator: search.Operator.ANYOF,
        values: subsidiary
      })
    );

    // Add filter to exclude inactive equipment
    equipmentSearch.filters.push(
      search.createFilter({
        name: 'isinactive',
        operator: search.Operator.IS,
        values: 'F'
      })
    );

    var equipmentResults = equipmentSearch.run().getRange({ start: 0, end: 1000 });
    var results = [];

    // Loop through the equipment results, but only return unique equipment (one card per equipment)
    equipmentResults.forEach(function (result) {
      var id = result.getValue('internalid');
      
      // Check if this equipment is already added to the results (in case it appears multiple times)
      if (results.find(result => result.id === id)) {
        return; // Skip this equipment if it has already been added
      }

      var imageId = result.getValue('custrecord_itbs_cmms_equip_image');
      var imageUrl = null;

      // Try loading image file URL
      if (imageId) {
        try {
          var fileObj = file.load({ id: imageId });
          imageUrl = fileObj.url;
        } catch (imgErr) {
          log.error({ title: 'Image Load Error', details: imgErr });
        }
      }

      // Fetch the latest reading for this equipment from readingData
      var readingInfo = readingData[id] || {};

      // Push the equipment result to display, including its latest reading
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
        reading_entered: readingInfo.reading || null,   // latest usage reading
        reading_created: readingInfo.created || null,   // latest created date
        image_url: imageUrl || null,
        subsidiary_id: subsidiary,
        subsidiary_name: result.getText('custrecord_itbs_cmms_equip_subsidiary') || 'N/A'
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







// ----------- New Action: getEquipmentList for Usage Reading ------------
function getEquipmentList(subsidiaryId) {
  try {
    const savedSearch = search.load({ id: 'customsearch_itbs_equipment_all_sub' });

    // Add subsidiary filter dynamically
    if (subsidiaryId) {
      savedSearch.filters.push(
        search.createFilter({
          name: 'custrecord_itbs_cmms_equip_subsidiary',
          operator: search.Operator.ANYOF,
          values: subsidiaryId
        })
      );
    }

    // Exclude inactive equipment
    savedSearch.filters.push(
      search.createFilter({
        name: 'isinactive',
        operator: search.Operator.IS,
        values: 'F'
      })
    );

    const results = [];
    const resultSet = savedSearch.run();
    let start = 0;
    const pageSize = 1000;
    let pagedResults;

    // Step 1: Load all equipment
    const equipmentData = {};
    do {
      pagedResults = resultSet.getRange({ start: start, end: start + pageSize });

      pagedResults.forEach(result => {
        const recordId = result.id;
        equipmentData[recordId] = {
          id: recordId,
          equipmentName: result.getValue({ name: 'name' }) || 'N/A',
          employeeName: result.getText({
            name: 'custrecord_itbs_cmms_employee',
            join: 'custrecord_itbs_cmms_equipment_'
          }) || 'N/A',
          location: result.getText('custrecord_itbs_cmms_equipt_location') || 'N/A',
          type: result.getText('custrecord_itbs_cmms_equip_type') || 'N/A',
          serialNumber: result.getValue('custrecord_itbs_cmms_equip_serial_number') || '',
          fixedAsset: result.getText('custrecord_itbs_cmms_eqp_fixedassetintid') || 'N/A',
          fixedAssetID: result.getValue('custrecord_itbs_cmms_eqp_fa_internal_id') || 0,
          subsidiaryId: subsidiaryId,
          subsidiaryName: result.getText('custrecord_itbs_cmms_equip_subsidiary') || 'N/A',
          reading: null,
          readingTimestamp: null
        };
      });

      start += pageSize;
    } while (pagedResults.length === pageSize);

    // Step 2: Fetch latest reading per equipment
    const readingSearch = search.create({
      type: 'customrecord_itbs_equipment_usage',
      filters: [
        ['custrecord_itbs_usage_equipment', 'anyof', Object.keys(equipmentData)]
      ],
      columns: [
        search.createColumn({ name: 'custrecord_itbs_quip_usage' }),
        search.createColumn({ name: 'custrecord_itbs_usage_equipment' }),
        search.createColumn({ name: 'created', sort: search.Sort.DESC }) // latest first
      ]
    });

    const readingResults = readingSearch.run().getRange({ start: 0, end: 1000 });

    const latestReadings = {};
    readingResults.forEach(r => {
      const eqId = r.getValue('custrecord_itbs_usage_equipment');
      if (eqId && !latestReadings[eqId]) { // Only store the first/latest reading for each equipment
        latestReadings[eqId] = {
          reading: r.getValue('custrecord_itbs_quip_usage'),
          readingTimestamp: r.getValue('created')
        };
      }
    });

    // Step 3: Merge latest reading into equipment
    Object.keys(equipmentData).forEach(eqId => {
      if (latestReadings[eqId]) {
        equipmentData[eqId].reading = latestReadings[eqId].reading;
        equipmentData[eqId].readingTimestamp = latestReadings[eqId].readingTimestamp;
      }
      results.push(equipmentData[eqId]);
    });

    return { success: true, equipment: results };

  } catch (e) {
    log.error('getEquipmentList failed', e);
    return { success: false, error: e.message };
  }
}





// ----------- POST FUNCTIONS ------------
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

// ----------- New Action: Mark Task As Completed ------------
function markTaskAsCompleted(context) {
  try {
    const { recordId } = context;

    if (!recordId) {
      return {
        success: false,
        error: 'Missing required parameter: recordId'
      };
    }

    record.submitFields({
      type: 'customrecord_itbs_cmms_srvc_conf_srv_tsk',
      id: recordId,
      values: {
        custrecord_itbs_cmms_cscst_taskcompleted: true
      }
    });

    return {
      success: true,
      message: 'Task Completed.'
    };
  } catch (error) {
    log.error('markTaskAsCompleted Error', error);
    return {
      success: false,
      error: error.message || 'Unexpected error while marking task as completed.'
    };
  }
}

// ----------- New Action: Get Last 10 Cases by Equipment ID ------------
function getLast10CasesByEquipmentId(context) {
  try {
    const equipmentId = context.equipmentId;
    if (!equipmentId) {
      return { success: false, error: 'Missing required parameter: equipmentId' };
    }

    const equipmentSearch = search.create({
      type: 'customrecord_itbs_cmms_equipment',
      filters: [
        ['internalid', 'anyof', equipmentId],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        // Case Subject (Joined from Case)
        search.createColumn({
          name: 'title',
          join: 'CUSTEVENT_ITBS_CMMS_CASE_EQUIPMENT',
          sort: search.Sort.DESC  // Sort by most recent case
        }),
        // Case Created Date
        search.createColumn({
          name: 'createddate',
          join: 'CUSTEVENT_ITBS_CMMS_CASE_EQUIPMENT'
        }),
        // Usage (Joined from Usage record)
        search.createColumn({
          name: 'custrecord_itbs_quip_usage',
          join: 'CUSTRECORD_ITBS_USAGE_EQUIPMENT'
        }),
        // Date of Last Service (from Equipment)
        search.createColumn({
          name: 'custrecord_itbs_cmms_eqp_doflastservice'
        })
      ]
    });

    const results = [];
    const searchResults = equipmentSearch.run().getRange({ start: 0, end: 10 });

    searchResults.forEach(result => {
      results.push({
        subject: result.getValue({
          name: 'title',
          join: 'CUSTEVENT_ITBS_CMMS_CASE_EQUIPMENT'
        }),
        created: result.getValue({
          name: 'createddate',
          join: 'CUSTEVENT_ITBS_CMMS_CASE_EQUIPMENT'
        }),
        usage: result.getValue({
          name: 'custrecord_itbs_quip_usage',
          join: 'CUSTRECORD_ITBS_USAGE_EQUIPMENT'
        }),
        dateOfLastService: result.getValue('custrecord_itbs_cmms_eqp_doflastservice')
      });
    });

    return {
      success: true,
      cases: results
    };
  } catch (error) {
    log.error('getLast10CasesByEquipmentId failed', error);
    return {
      success: false,
      error: error.message || 'Unexpected error retrieving equipment case data.'
    };
  }
}

// ----------- New Action: POST Submit Case Details(Service Form) ------------
function submitCaseData(context) {
  try {
    const timesheets = context.timesheets;
    const imagePayload = context.imagePayload;
    const otherPayload = context.otherPayload;
    const caseNumber = imagePayload.caseNumber;

    const signatureFolderId = 5064053;
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

    // ✅ Update parts usage + memo field
    for (let part of otherPayload.taskParts) {
      const updateValues = {
        custrecord_itbs_cmms_qty_used_case: part.qtyUsed,
        custrecord_itbs_qty_to_return: part.qtyReturned
      };

      if (part.memo) {
        updateValues.custrecord_itbs_memo = part.memo;
      }

      record.submitFields({
        type: 'customrecord_itbs_omn_service_parts',
        id: part.servicePartId,
        values: updateValues
      });
    }

    // ✅ Timesheet flags
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


// ----------- New Action: POST Submit Usage Reading ------------
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

// 🧩 Include your functions here...
  // - getCases
  // - getEquipmentList
  // - getEquipmentBySubsidiaryName
  // - getCaseDetails
  // - submitUsageReading
  // - uploadTimesheet
  // - submitCaseData

  // ⚠️ Copy the full implementations of those functions from your RESTlet
  //    and paste them here, unchanged except for `log` instead of `N/log`, etc.

  return { onRequest };
});