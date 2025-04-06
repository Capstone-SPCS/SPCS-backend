export const createEvent = `
  mutation CreateEvent(
    $tca: timestamp!,
    $sat1_object_designator: String!,
    $sat2_object_designator: String!
  ) {
    insert_events_one(object: {
      tca: $tca,
      sat1_object_designator: $sat1_object_designator,
      sat2_object_designator: $sat2_object_designator
    }) {
      id
    }
  }
`