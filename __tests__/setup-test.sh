 cd ../docker/tables; /bin/bash ./delete-test-tables.sh
 /bin/bash ./test-tables.sh


FOO=$(curl -X POST --location "http://localhost:3000/material-types/batch" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer my_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

echo $FOO

FOO=$(curl -X POST --location "http://localhost:3000/price-sheets/batch" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer my_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

echo $FOO

FOO=$(curl -X PUT --location "http://localhost:3000/material-types/batch" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer my_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

echo $FOO

FOO=$(curl -X PUT --location "http://localhost:3000/price-sheets/batch" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer my_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

echo $FOO


