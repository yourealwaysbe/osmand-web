import { ButtonGroup, IconButton, Paper, Tooltip, CircularProgress } from '@mui/material';
import { Close, Delete, Cloud, CloudUpload, Redo, Undo, Create, MenuOpen, Download } from '@mui/icons-material';
import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../../context/AppContext';
import SaveTrackDialog from './track/dialogs/SaveTrackDialog';
import DeleteTrackDialog from './track/dialogs/DeleteTrackDialog';
import DeleteFavoriteDialog from './favorite/DeleteFavoriteDialog';
import _ from 'lodash';
import TracksManager, { isEmptyTrack } from '../../context/TracksManager';
import useUndoRedo from '../useUndoRedo';
import { confirm } from '../../dialogs/GlobalConfirmationDialog';
import { downloadGpx } from './tabs/GeneralInfoTab';

const PanelButtons = ({
    orientation,
    tooltipOrientation,
    setShowInfoBlock,
    infoBlockOpen,
    setInfoBlockOpen,
    clearState,
    mobile,
    bsize,
}) => {
    const ctx = useContext(AppContext);

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [useSavedState, setUseSavedState] = useState(false);

    const toggleInfoBlock = () => {
        setInfoBlockOpen(!infoBlockOpen);
    };

    const { state, setState, undo, redo, clear, isUndoPossible, isRedoPossible, pastStates } = useUndoRedo();

    const isUndoDisabled =
        !isUndoPossible || (pastStates.length === 1 && _.isEmpty(pastStates[0])) || ctx.selectedGpxFile.syncRouting;
    const isRedoDisabled = !isRedoPossible || ctx.selectedGpxFile.syncRouting;
    const isProfileProgress = ctx.processRouting;

    useEffect(() => {
        if (clearState) {
            doClear();
        }
    }, [clearState]);

    useEffect(() => {
        if (useSavedState) {
            getState(state);
            ctx.setTrackState({ ...ctx.trackState });
        }
    }, [state]);

    useEffect(() => {
        if (!useSavedState) {
            if (ctx.trackState.update) {
                setState(_.cloneDeep(ctx.selectedGpxFile));
                ctx.trackState.update = false;
                ctx.setTrackState({ ...ctx.trackState });
            }
        }
    }, [ctx.trackState]);

    function doClear() {
        clear(); // setState() can't be used inside dispatch()
        ctx.setTrackState({ update: false });
    }

    function getState(nextState) {
        getTrack(nextState);
        setUseSavedState(false);
    }

    function getTrack(nextState) {
        const currentLayers = _.cloneDeep(ctx.selectedGpxFile.layers);
        const objFromState = _.cloneDeep(nextState);
        objFromState.syncRouting = true; // will be 1st effect
        objFromState.updateLayers = true; // will be 2nd effect
        objFromState.layers = currentLayers; // use actual layers
        ctx.setSelectedGpxFile(objFromState);
    }

    function getMarginTop() {
        if (mobile) {
            return orientation === 'vertical' ? `${bsize * 3.5}px` : 0;
        } else {
            return orientation === 'vertical' ? `-${bsize * 0.2}px` : 0;
        }
    }

    function getMarginLeft() {
        if (mobile) {
            return orientation === 'vertical' ? `-${bsize}px` : `${bsize}px`;
        } else {
            return orientation === 'vertical' ? 0 : `${bsize}px`;
        }
    }

    // little align elements with "disabled" attr, which must be covered with <span>, due to Tooltip warnings
    const styleSpan = {
        marginTop: orientation === 'vertical' ? 0 : '2px',
        marginLeft: orientation === 'vertical' ? '2px' : 0,
    };

    return (
        ctx.selectedGpxFile && (
            <div
                style={{
                    marginTop: getMarginTop(),
                    marginLeft: getMarginLeft(),
                    marginBottom: !mobile && 'auto',
                }}
            >
                <Paper>
                    <ButtonGroup
                        sx={{
                            boxShadow: '0 1px 5px rgba(0,0,0,0.65)',
                            borderRadius: '4px',
                            width: orientation === 'vertical' ? bsize : 'auto',
                            height: orientation === 'vertical' ? 'auto' : bsize,
                        }}
                        orientation={orientation}
                        color="primary"
                    >
                        {ctx.currentObjectType === ctx.OBJECT_TYPE_CLOUD_TRACK && (
                            <>
                                <Tooltip title="Cloud track" arrow placement={tooltipOrientation}>
                                    <IconButton
                                        variant="contained"
                                        type="button"
                                        onClick={() =>
                                            confirm({
                                                ctx,
                                                text: 'Open Cloud track in Local editor?',
                                                callback: () => TracksManager.handleEditCloudTrack(ctx),
                                            })
                                        }
                                    >
                                        <Cloud fontSize="medium" color="primary" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit" arrow placement={tooltipOrientation}>
                                    <IconButton
                                        variant="contained"
                                        type="button"
                                        onClick={() => TracksManager.handleEditCloudTrack(ctx)}
                                    >
                                        <Create fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        {ctx.createTrack && (
                            <Tooltip title="Change profile" arrow placement={tooltipOrientation}>
                                <IconButton
                                    sx={{ width: 40, height: 40 }}
                                    variant="contained"
                                    type="button"
                                    onClick={() => {
                                        ctx.trackProfileManager.change = TracksManager.CHANGE_PROFILE_ALL;
                                        ctx.setTrackProfileManager({ ...ctx.trackProfileManager });
                                    }}
                                >
                                    {isProfileProgress ? (
                                        <CircularProgress size={40 - 16} />
                                    ) : (
                                        ctx.trackRouter.getProfile()?.icon
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                        {ctx.loginUser && ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK && (
                            <Tooltip title="Save to cloud" arrow placement={tooltipOrientation}>
                                <span style={styleSpan}>
                                    <IconButton
                                        variant="contained"
                                        type="button"
                                        disabled={isEmptyTrack(ctx.selectedGpxFile)}
                                        onClick={() => {
                                            ctx.setUpdateInfoBlock(true);
                                            ctx.selectedGpxFile.save = true;
                                            ctx.setSelectedGpxFile({ ...ctx.selectedGpxFile });
                                        }}
                                    >
                                        <CloudUpload fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK && (
                            <Tooltip title="Undo" arrow placement={tooltipOrientation}>
                                <span style={styleSpan}>
                                    <IconButton
                                        variant="contained"
                                        type="button"
                                        disabled={isUndoDisabled}
                                        onClick={(e) => {
                                            undo();
                                            setUseSavedState(true);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Undo fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK && (
                            <Tooltip title="Redo" arrow placement={tooltipOrientation}>
                                <span style={styleSpan}>
                                    <IconButton
                                        variant="contained"
                                        type="button"
                                        disabled={isRedoDisabled}
                                        onClick={(e) => {
                                            redo();
                                            setUseSavedState(true);
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Redo fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {ctx.currentObjectType !== ctx.OBJECT_TYPE_WEATHER &&
                            ctx.currentObjectType !== ctx.OBJECT_TYPE_POI && (
                                <Tooltip title="Download GPX" arrow placement={tooltipOrientation}>
                                    <span style={styleSpan}>
                                        <IconButton
                                            variant="contained"
                                            type="button"
                                            disabled={isEmptyTrack(ctx.selectedGpxFile)}
                                            onClick={() => downloadGpx(ctx)}
                                        >
                                            <Download fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        {ctx.currentObjectType !== ctx.OBJECT_TYPE_WEATHER &&
                            ctx.currentObjectType !== ctx.OBJECT_TYPE_POI && (
                                <Tooltip title="Delete" arrow placement={tooltipOrientation}>
                                    <IconButton
                                        sx={{ mb: '1px' }}
                                        variant="contained"
                                        type="button"
                                        onClick={() => setOpenDeleteDialog(true)}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        {ctx.currentObjectType && !infoBlockOpen && !mobile && (
                            <Tooltip title="Open info" arrow placement={tooltipOrientation}>
                                <IconButton onClick={toggleInfoBlock} sx={{ transform: 'scaleX(1)' }}>
                                    <MenuOpen fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {ctx.currentObjectType && infoBlockOpen && !mobile && (
                            <Tooltip title="Close info" arrow placement={tooltipOrientation}>
                                <IconButton onClick={toggleInfoBlock} sx={{ transform: 'scaleX(-1)' }}>
                                    <MenuOpen fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Close" arrow placement={tooltipOrientation}>
                            <IconButton
                                variant="contained"
                                type="button"
                                onClick={() => {
                                    doClear();
                                    setShowInfoBlock(false);
                                }}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>
                </Paper>
                {ctx.selectedGpxFile.save && <SaveTrackDialog />}
                {openDeleteDialog &&
                    (ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK ||
                        ctx.currentObjectType === ctx.OBJECT_TYPE_CLOUD_TRACK) && (
                        <DeleteTrackDialog
                            dialogOpen={openDeleteDialog}
                            setDialogOpen={setOpenDeleteDialog}
                            setShowInfoBlock={setShowInfoBlock}
                        />
                    )}
                {openDeleteDialog && ctx.currentObjectType === ctx.OBJECT_TYPE_FAVORITE && (
                    <DeleteFavoriteDialog dialogOpen={openDeleteDialog} setDialogOpen={setOpenDeleteDialog} />
                )}
            </div>
        )
    );
};

export default PanelButtons;
