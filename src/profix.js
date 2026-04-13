/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */

define(['N/search', 'N/log'], function (search, log) {

    // Function to get the case count by status and technician
    function getCaseCountByStatus(employeeId, statusId) {
        try {
            var filters = [];

            // Filter cases by technician (employee)
            if (employeeId) {
                filters.push(search.createFilter({
                    name: 'custrecord_itbs_cmms_technician', // Field on the joined record
                    join: 'custrecord_itbs_cmms_case', // The join relationship
                    operator: search.Operator.IS,
                    values: [employeeId]
                }));
            }

            // Filter by case status if provided
            if (statusId) {
                filters.push(search.createFilter({
                    name: 'status',
                    operator: search.Operator.ANYOF,
                    values: [statusId]
                }));
            }

            // Create a search to count the cases based on filters
            var filteredSearch = search.create({
                type: search.Type.SUPPORT_CASE,
                filters: filters,
                columns: [
                    search.createColumn({
                        name: 'internalid',
                        summary: search.Summary.COUNT
                    })
                ]
            });

            var resultSet = filteredSearch.run().getRange({ start: 0, end: 1 });
            if (resultSet.length > 0) {
                return resultSet[0].getValue({
                    name: 'internalid',
                    summary: search.Summary.COUNT
                });
            }
            return 0;
        } catch (searchError) {
            log.error('Search Error', searchError.message);
            return 0; // Return 0 if search fails
        }
    }

    // RESTlet GET handler
    function doGet(requestParams) {
        try {
            var employeeId = requestParams.employeeId; // Retrieve the employeeId from request params

            // Fetch the case counts for the specified employee
            var totalCases = getCaseCountByStatus(employeeId); // Total cases (no status filter)
            var pendingCases = getCaseCountByStatus(employeeId, '1'); // Pending cases (Status ID: "Not Started")
            var completedCases = getCaseCountByStatus(employeeId, '7'); // Completed cases (Status ID: "Technician Completed")

            // Return the response as a JSON object
            return {
                success: true,
                message: 'Case breakdown for the specified employee.',
                employeeId: employeeId,
                totalCases: totalCases,
                pendingCases: pendingCases,
                completedCases: completedCases
            };
        } catch (error) {
            log.error('Error in RESTlet', error.message);
            return {
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            };
        }
    }

    // Expose the doGet function for external access
    return {
        get: doGet
    };

});
