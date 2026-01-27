/**
 * Records Page - Phase 4.3 implementation
 */

import React, { useState } from "react";
import RecordsList from "./RecordsList";
import CreateRecordForm from "../components/CreateRecordForm";
import "./RecordsPage.css";

const RecordsPage = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
  };

  return (
    <div className="records-page">
      {!showCreateForm}

      {showCreateForm ? (
        <CreateRecordForm
          onSuccess={handleCreateSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <RecordsList />
      )}
    </div>
  );
};

export default RecordsPage;
