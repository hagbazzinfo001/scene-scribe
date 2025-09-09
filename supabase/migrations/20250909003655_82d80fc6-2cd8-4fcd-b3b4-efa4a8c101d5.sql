-- Add missing columns to jobs table for proper asset lifecycle
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS input_path text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS output_path text;

-- Create delete asset function for safe asset removal
CREATE OR REPLACE FUNCTION delete_user_asset(asset_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    asset_record user_assets%ROWTYPE;
    result json;
BEGIN
    -- Get asset record to delete from storage
    SELECT * INTO asset_record 
    FROM user_assets 
    WHERE id = asset_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Asset not found or access denied');
    END IF;
    
    -- Delete from user_assets table
    DELETE FROM user_assets WHERE id = asset_id AND user_id = auth.uid();
    
    -- Return storage info for frontend to clean up
    RETURN json_build_object(
        'success', true, 
        'storage_path', asset_record.storage_path,
        'file_url', asset_record.file_url
    );
END;
$$;