
async function runIntrospection() {
    // console.log("Introspection function started");

const introspectionQuery = `
{
  __schema {
    queryType {
      name
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
}
`;

    const token = localStorage.getItem("jwt");

    // console.log("Token:", token);

    try {
        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ query: introspectionQuery }),
        });

        // console.log("Response status:", response.status);

        const text = await response.text();
        // console.log("Raw response:", text);

        const data = JSON.parse(text);

        

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            return;
        }

        // console.log("✅ GraphQL Schema Introspection Result:", data);

        // console.log("Available Queries:");
        data.data.__schema.queryType.fields.forEach(f => {
        // console.log("•", f.name, "→", f.type.name || f.type.ofType?.name);
});
    } catch (err) {
        console.error("❌ Fetch Error:", err);
    }
}

runIntrospection();


async function inspectUserType() {
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No token found — please log in first.");
        return;
    }

    // ✅ Properly formatted template literal
    const userTypeQuery = `
    {
      __type(name: "user") {
        name
        description
        fields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }`;

    try {
        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: userTypeQuery })
        });

        const data = await response.json();

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            return;
        }

        const userType = data.data.__type;
        if (!userType) {
            console.error("Type 'user' not found. Maybe the type has a different name.");
            return;
        }

        // console.log("Fields of `user` type:");
        userType.fields.forEach(f => {
            // console.log("•", f.name, "→", f.type.name || f.type.ofType?.name);
        });

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// Call the function
inspectUserType();


async function fetchUserById() {
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No token found — please log in first.");
        return;
    }

    const userId = 3164; // Replace with the desired ID

    // GraphQL query string
     const query = `
    {
      users(where: {id: {_eq: ${userId}}}) {
        id
        login
        email
        createdAt
        campus
      }
    }`;

    try {
        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: query }) // ✅ properly closed
        }); // ✅ fetch call properly closed

        const data = await response.json();

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            return;
        }

        console.log("User data:", data.data.users[0]); // first (and only) result

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// Call the function
// fetchUserById();
