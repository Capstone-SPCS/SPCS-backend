export const findMatchingEvent = `
  query FindMatchingEvent(
    $sat1_object_designator: String!,
    $sat2_object_designator: String!,
    $tca_start: timestamp!,
    $tca_end: timestamp!
  ) {
    events(where: {
      _and: [
        {
          _or: [
            {
              _and: [
                { sat1_object_designator: { _eq: $sat1_object_designator } },
                { sat2_object_designator: { _eq: $sat2_object_designator } }
              ]
            },
            {
              _and: [
                { sat1_object_designator: { _eq: $sat2_object_designator } },
                { sat2_object_designator: { _eq: $sat1_object_designator } }
              ]
            }
          ]
        },
        {
          tca: { _gte: $tca_start, _lte: $tca_end }
        }
      ]
    }) {
      id
    }
  }
`