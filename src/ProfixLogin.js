/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record', 'N/search', 'N/encode', 'N/log', 'N/crypto'], function(record, search, encode, log, crypto) {

    const PASSCODE_FIELD_ID = 'custentity_itbs_profix_password'; // Encrypted password (Base64)
    const SESSION_ID_FIELD_ID = 'custentity_itbs_profix_session_id'; // Session ID field
    const ROLE_FIELD_ID = 'custentity_itbs_profix_access_role'; // Role field for the user
    const SUBSIDIARY_FIELD_ID = 'custentity_itbs_profix_subsidiary';

    function doPost(requestBody) {
        try {
            const email = requestBody.email;
            const inputPassword = requestBody.password;

            if (!email || !inputPassword) {
                return { success: false, message: 'Email and password are required.' };
            }

            // Step 1: Search for the employee by email
            const employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [['email', 'is', email]],
                columns: ['internalid', 'entityid', ROLE_FIELD_ID, SUBSIDIARY_FIELD_ID]
            });

            let employeeId = null;
            let entityId = '';
            let role = ''; // Initialize the role variable
            let subsidiary = '';

            employeeSearch.run().each(result => {
                employeeId = result.getValue({ name: 'internalid' });
                entityId = result.getValue({ name: 'entityid' });
                role = result.getText({ name: ROLE_FIELD_ID }); // Fetch role
                subsidiary = result.getValue({ name: SUBSIDIARY_FIELD_ID });

                return false; // Only process the first result
            });

            if (!employeeId) {
                return { success: false, message: 'Employee not found.' };
            }

            log.error('employeeID: ', employeeId);
            log.error('entityId: ', entityId);
            log.error('role: ', role);
            log.error('subsidiary: ', subsidiary);

            const validPassword = crypto.checkPasswordField({
                recordType: 'employee',
                recordId: +employeeId,
                fieldId: PASSCODE_FIELD_ID,
                value: inputPassword
            });

            if (validPassword) {
                const sessionId = generateSessionId();

                // Step 5: Update employee record
                record.submitFields({
                    type: record.Type.EMPLOYEE,
                    id: employeeId,
                    values: {
                        [SESSION_ID_FIELD_ID]: sessionId
                    }
                });

                // Return success with role included
                return {
                    success: true,
                    entityId: entityId,
                    employeeId: employeeId,
                    sessionId: sessionId,
                    role: role, // Return role to the frontend
                    subsidiary: subsidiary
                };
            } else {
                return {
                    success: false,
                    message: 'Invalid password.',
                    entityId: entityId,
                    employeeId: employeeId,
                    sessionId: null
                };
            }

        } catch (err) {
            log.error('RESTlet Error', err);
            return { success: false, message: 'Internal server error.' };
        }
    }

    // Generate session ID
    function generateSessionId() {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 10);
        return `${timestamp}-${randomPart}`;
    }

    return {
        post: doPost
    };
});
