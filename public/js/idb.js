// const { response } = require("express");

// create variable for db
let db;

// create connection to indexeddb for budget tracker
const request = indexedDB.open('budget_tracker', 1)

// handle upgrades and versioning
request.onupgradeneeded = function (event) {
    // save a reference to the database
    const db = event.target.result;
    // create an object store 'new_budget', set it to have auto incrementing primary key
    db.createObjectStore('new_budget', { autoIncrement: true })
};

// upon successful db connection/creation
request.onsuccess = function (event) {
    // save reference to db in global variable
    db = event.target.result;
    // if offline run uploadBudget() and store in indexedDb
    if (navigator.onLine) {
        uploadBudget();
    };
};

request.onerror = function (event) {
    // log error to console
    console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new budget and there's no internet connection
function saveBudget(record) {
    // open a new transaction with the database with read and write permissions 
    const budget = db.transaction(['new_budget'], 'readwrite');

    // access the object store for `new_budget`
    const budgetObjectStore = budget.objectStore('new_budget');

    // add record to your store with add method
    budgetObjectStore.add(record);
}

function uploadBudget() {
    // open transaction with db to read data
    const transaction = db.transaction(['new_budget'], 'readwrite');
    // access the object store
    const budgetObjectStore = transaction.objectStore('new_budget');
    // get all records from store and place into variable
    const getAll = budgetObjectStore.getAll();

    getAll.onsuccess = function () {
        // sync any data stored in indexeddb with central server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    };

                    // Open one more transaction
                    const transaction = db.transaction(['new_budget'], 'readwrite');

                    // Access the new_budget to object store
                    const budgetObjectStore = transaction.objectStore('new_budget');

                    // Clear all the items in the object store
                    budgetObjectStore.clear();

                    alert('All submitted budgets have been saved');
                })
                .catch(err => {
                    console.log(err);
                })
        };
    };
};

// Listen for when the app goes back online
window.addEventListener('online', uploadBudget);

