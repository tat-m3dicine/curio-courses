# Onboarding Checklist

## Development :-
*  Microservice source [repository link](https://github.com/saaltech/curio-courses).
    * `https://github.com/saaltech/curio-courses`
*  The service must be dockerized.
    * YES
*  Are there appropriate linting, unit(50% coverage), integration, and end-to-end tests in place for the microservice?
    * NO
*  Are there code review procedures and policies in place?
    * YES
*  Is the test, packaging, build, and release process documented?
    * YES
*  Who is the service owner ?
    * Omar Einea (omar@saal.ai)

## Dependencies :-
*  What are this microservice’s dependencies?
    * Mongo Db

*  What are its clients?
    * Client facing

*  Are the environment variables,configurations etc documented and has appropriate default values ?
    * [YES](https://github.com/saaltech/curio-courses#environment-variables)

*  How does this microservice mitigate dependency failures?
    * **Mongo is manditory**: MongoDb has to be online for this service to function, it will try to connect on each request if the connection is lost.

*  Are there backups, alternatives, fallbacks etc for each dependency?
    * MongoDb: 
        * Alternatives: No.
        * Fallbacks: Yes through Mongo Cluster.
        * Backups: Yes.

*  Are the dependencies scalable and performant?
    * **MongoDb**: Can be scaled using Mongo Cluster.

*  Will the dependencies scale with this microservice’s expected growth?
    * **MongoDb**: Yes. using cluster.

*  Are dependency owners prepared for this microservice’s expected growth?
    * YES.

## Routing and Discovery :-
*  Are health checks to the microservice reliable?
    * YES.
*  Do health checks accurately reflect the health of the microservice?
    * YES.

## Scalability :-
*  What is this microservice’s qualitative growth scale e.g., whether it scales with page views or customer orders ?
    * **Data**: It scales with the number of users added to the system.
    * **Processing**: It is horizontally scalable by increasing the replicas.

*  What is this microservice’s quantitative growth scale e.g., how many requests per second it can handle?
    * 3000/rps.
*  Are there any scalability or performance limitations in the way the microservice handles requests?
    * No.
*  Are there any scalability or performance limitations in the way the microservice processes tasks?
    * No.
*  Do developers on the microservice team understand how their service processes tasks, how efficiently it processes those tasks, and how the service will perform as the number of tasks and requests increases?
    * Yes.

## Capacity Planning :-
*  What are the microservice’s resource requirements (CPU, RAM, etc.) per service instance?
    * CPU: 1 vCPU.
    * RAM: 200 MiB.
*  Service profiling on the laptop should be done by the service owner for three cases - 10rps,100rps and 1000rps.
    * 10rps: AVG: 26ms.
    * 100rps: AVG: 36ms.
    * 1000rps: AVG: 100ms.
*  How much traffic can one instance of the microservice handle?
    * 500rps tested.
*  Are there any other resource requirements that are specific to this microservice?
    * Diskspace for MonogDb.
*  What are the resource bottlenecks of this microservice?
    * N/A.
*  Does this microservice need to be scaled vertically, horizontally, or both?
    * horizontally only.

## Data Storage :-
*  Does this microservice handle data in a scalable and performant way?
    * YES.
*  What type of data does this microservice need to store?
    * Items and there audit trails and metadata.
*  What is the schema needed for its data?
    * JSON schema-less.
*  How many transactions/queries are needed and/or made per second?
    * Same as Requests/Seconds O(N). 1 query per request.
*  Does this microservice need higher read or write performance or both?
    * Balanced.
*  Is this service’s database scaled horizontally or vertically? Is it replicated or partitioned?
    * horizontally, replicated and partitioned.
*  Is this microservice using a dedicated or shared database?
    * dedicated
*  How does the service handle and/or store test data?
    * same as normal data.

## Fault tolerant and Catostrophic preparedness :-
*  Does the microservice have a single point of failure?
    * If DB is clusterd and service runs on multible instances then No.

*  Does it have more than one point of failure?
    * No.

*  Can any points of failure be architected away, or do they need to be mitigated?
    * N/A.

*  What sorts of dependency failures can affect this microservice?
    * DB Connection loss renders the service offline.

*  What are the internal failures that could bring down this microservice?
    * None.

*  Have all of the microservice’s failure scenarios and possible catastrophes been identified?
    * Db Connection loss. (Handled by failing the request with 500 status code.)

*  What are common failures across the microservice ecosystem?
   * Db connection loss and Network timeouts.

*  Can this microservice undergo regular, scheduled load testing?
   * Any Time.

*  Are all possible failure scenarios implemented and tested using chaos testing?
   * Yes.

*  How do failures and outages of this microservice impact the business?
   * Unable to sync changes with respective products.

## Logging :-
*  What information does this microservice need to log?
    * Every Http request:(Tenant, URL, Status Code, Response Time).
    * Any exception which might occur (Handled or Unhandled).
    * Stack traces.

*  Does this microservice log all important requests,responses,errors,failures etc?
    * YES.

*  Is the log level configurable through environment variables?
    * YES. (logstash)

*  Does the logging accurately reflect the state of the microservice at any given time?
    * YES.

*  Is this logging solution cost-effective and scalable?
    * YES.

## Documentation:-
*  Is the documentation for all microservices stored in a centralized, shared, and easily accessible place?
    * Github.
    * Jira.

*  Are significant changes to the microservice accompanied by updates to the microservice’s documentation?
    * YES.

*  Does the microservice’s documentation contain a description of the microservice?
    * YES.

*  Does the microservice’s documentation contain an architecture diagram?
    * YES.

*  Does the microservice’s documentation contain service owner contacts ?
    * YES.

*  Does the microservice’s documentation contain links to important information?
    * YES.

*  Does the microservice’s documentation contain an onboarding and development guide?
    * YES.

*  Does the microservice’s documentation contain information about the microservice’s request flow, endpoints, and dependencies?
    * YES.

*  Does the microservice’s documentation contain an FAQ section?
    * YES.

*  Can every developer on the team answer questions about the production-readiness of the microservice?
    * YES.

*  Is the microservices reviewed and audited frequently?
    * YES.