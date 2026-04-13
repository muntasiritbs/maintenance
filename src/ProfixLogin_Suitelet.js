/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/crypto', 'N/log'], function (ui, record, search, crypto, log) {

  const PASSCODE_FIELD_ID = 'custentity_itbs_profix_password';
  const SESSION_ID_FIELD_ID = 'custentity_itbs_profix_session_id';
  const ROLE_FIELD_ID = 'custentity_itbs_profix_access_role';
  const SUBSIDIARY_FIELD_ID = 'custentity_itbs_profix_subsidiary';

  function onRequest(context) {
    const request = context.request;
    const response = context.response;

    // Set CORS headers
    response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' });
    response.setHeader({ name: 'Access-Control-Allow-Headers', value: 'Content-Type' });
    response.setHeader({ name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' });
    response.setHeader({ name: 'Content-Type', value: 'application/json' });

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      response.write(JSON.stringify({ success: true }));
      return;
    }

    // Allow only POST method
    if (request.method !== 'POST') {
      response.write(JSON.stringify({ success: false, message: 'Only POST method is allowed' }));
      return;
    }

    let requestBody;
    try {
      requestBody = JSON.parse(request.body || '{}');
    } catch (err) {
      log.error('Invalid JSON', err);
      response.write(JSON.stringify({ success: false, message: 'Invalid JSON format' }));
      return;
    }

    const email = requestBody.email;
    const inputPassword = requestBody.password;

    if (!email || !inputPassword) {
      response.write(JSON.stringify({ success: false, message: 'Email and password are required.' }));
      return;
    }

    try {
      // Step 1: Search for employee by email
      const employeeSearch = search.create({
        type: search.Type.EMPLOYEE,
        filters: [
          ['email', 'is', email],
          'AND',
          ['isinactive', 'is', 'F']
        ],
        columns: ['internalid', 'entityid', ROLE_FIELD_ID, SUBSIDIARY_FIELD_ID]
      });

      let employeeId = null;
      let entityId = '';
      let role = '';
      let subsidiary = '';

      employeeSearch.run().each(result => {
        employeeId = result.getValue({ name: 'internalid' });
        entityId = result.getValue({ name: 'entityid' });
        role = result.getText({ name: ROLE_FIELD_ID });
        subsidiary = result.getValue({ name: SUBSIDIARY_FIELD_ID });
        return false; // stop after first result
      });

      if (!employeeId) {
        response.write(JSON.stringify({ success: false, message: 'Employee not found.' }));
        return;
      }

      log.debug('employeeId', employeeId);
      log.debug('entityId', entityId);
      log.debug('role', role);
      log.debug('subsidiary', subsidiary);

      // Step 2: Validate password
      const validPassword = crypto.checkPasswordField({
        recordType: 'employee',
        recordId: +employeeId,
        fieldId: PASSCODE_FIELD_ID,
        value: inputPassword
      });

      if (validPassword) {
        const sessionId = generateSessionId();

        // Step 3: Store session ID
        record.submitFields({
          type: record.Type.EMPLOYEE,
          id: employeeId,
          values: {
            [SESSION_ID_FIELD_ID]: sessionId
          }
        });

        response.write(JSON.stringify({
          success: true,
          employeeId,
          entityId,
          sessionId,
          role,
          subsidiary
        }));
      } else {
        response.write(JSON.stringify({
          success: false,
          message: 'Invalid password.',
          employeeId,
          entityId,
          sessionId: null
        }));
      }

    } catch (err) {
      log.error('Suitelet Error', err);
      response.write(JSON.stringify({ success: false, message: 'Internal server error.' }));
    }
  }

  // Session ID generator
  function generateSessionId() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}`;
  }

  return {
    onRequest
  };
});