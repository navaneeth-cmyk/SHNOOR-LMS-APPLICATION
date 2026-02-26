import { useParams, useLocation } from "react-router-dom";

const EditContest = () => {
  const { id } = useParams();
  const location = useLocation();

  console.log("Edit ID:", id);
  console.log("Passed contest:", location.state?.contest);

  return (
    <div>
      <h1>Edit Contest Page</h1>
      <p>Contest ID: {id}</p>
    </div>
  );
};

export default EditContest;